export type TurboVectorRotation = "legacy_pseudo" | "rht_pad512";
export type TurboVectorQuantizer = "minmax_uint8" | "normal_quantile_uint8";

export interface TurboVectorConfig {
  dim: number;
  bits: 8;
  seed: number;
  normalize: boolean;
  rotation: TurboVectorRotation;
  quantizer: TurboVectorQuantizer;
  residualCorrection: boolean;
}

export interface QuantizedVector {
  dim: number;
  method: "turboquant_lite_uint8" | "turboquant_rht_normal_uint8";
  min: number;
  scale: number;
  codes: Uint8Array;
  rotation?: TurboVectorRotation;
  quantizer?: TurboVectorQuantizer;
  residualCorrection?: boolean;
}

export const TURBO_VECTOR_CONFIG: TurboVectorConfig = {
  dim: 512,
  bits: 8,
  seed: 42,
  normalize: true,
  rotation: "rht_pad512",
  quantizer: "normal_quantile_uint8",
  residualCorrection: true
};

export const LEGACY_TURBO_VECTOR_CONFIG: TurboVectorConfig = {
  dim: 384,
  bits: 8,
  seed: 42,
  normalize: true,
  rotation: "legacy_pseudo",
  quantizer: "minmax_uint8",
  residualCorrection: false
};

const permutationCache = new Map<string, { permutation: number[]; signs: number[] }>();
const signCache = new Map<string, number[]>();
const codebookCache = new Map<string, number[]>();

export function normalizeVector(v: number[]): number[] {
  const norm = Math.sqrt(v.reduce((acc, x) => acc + x * x, 0)) || 1;
  return v.map((x) => x / norm);
}

export function legacyPseudoRotate(v: number[], seed = 42): number[] {
  const { permutation, signs } = getRotationPlan(v.length, seed);
  return permutation.map((sourceIndex, index) => v[sourceIndex] * signs[index]);
}

export const pseudoRotate = legacyPseudoRotate;

export function randomizedHadamardRotate(v: number[], seed = 42): number[] {
  const dim = nextPowerOfTwo(v.length);
  const padded = resizeVector(v, dim);
  const signs = getSigns(dim, seed);
  const rotated = padded.map((value, index) => value * signs[index]);
  fastWalshHadamardTransform(rotated);
  const scale = 1 / Math.sqrt(dim);
  return rotated.map((value) => value * scale);
}

export function quantizeVector(
  embedding: number[],
  config: TurboVectorConfig = TURBO_VECTOR_CONFIG
): QuantizedVector {
  if (config.rotation === "legacy_pseudo" || config.quantizer === "minmax_uint8") {
    return quantizeLegacyMinMax(embedding, config);
  }

  const resized = resizeVector(embedding, config.dim);
  const base = config.normalize ? normalizeVector(resized) : resized;
  const rotated = randomizedHadamardRotate(base, config.seed);
  const levels = 2 ** config.bits - 1;
  const codebook = normalQuantileCodebook(rotated.length, levels + 1);
  const codes = new Uint8Array(rotated.length);

  for (let i = 0; i < rotated.length; i += 1) {
    codes[i] = encodeNormalQuantile(rotated[i], codebook, config.residualCorrection);
  }

  return {
    dim: rotated.length,
    method: "turboquant_rht_normal_uint8",
    min: 0,
    scale: 1,
    codes,
    rotation: config.rotation,
    quantizer: config.quantizer,
    residualCorrection: config.residualCorrection
  };
}

export function dequantizeVector(q: QuantizedVector): number[] {
  if (q.method === "turboquant_rht_normal_uint8" || q.quantizer === "normal_quantile_uint8") {
    const codebook = normalQuantileCodebook(q.dim, 256);
    return Array.from(q.codes).map((code) => codebook[code] ?? 0);
  }
  return Array.from(q.codes).map((code) => q.min + code * q.scale);
}

export function dot(a: number[], b: number[]): number {
  let total = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i += 1) total += a[i] * b[i];
  return total;
}

export function cosineApproxFromQuantized(a: QuantizedVector, b: QuantizedVector): number {
  const da = dequantizeVector(a);
  const db = dequantizeVector(b);
  const denom = Math.sqrt(dot(da, da)) * Math.sqrt(dot(db, db)) || 1;
  return dot(da, db) / denom;
}

export function encodeCodes(codes: Uint8Array): Buffer {
  return Buffer.from(codes);
}

export function decodeCodes(input: Buffer | Uint8Array | number[]): Uint8Array {
  if (input instanceof Uint8Array) return input;
  return Uint8Array.from(input);
}

export function estimateQuantizedVectorBytes(q: QuantizedVector) {
  return q.codes.byteLength + 16;
}

function quantizeLegacyMinMax(embedding: number[], config: TurboVectorConfig): QuantizedVector {
  const resized = resizeVector(embedding, config.dim);
  const base = config.normalize ? normalizeVector(resized) : resized;
  const rotated = legacyPseudoRotate(base, config.seed);
  const min = Math.min(...rotated);
  const max = Math.max(...rotated);
  const levels = 2 ** config.bits - 1;
  const scale = max === min ? 1 : (max - min) / levels;

  const codes = new Uint8Array(rotated.length);
  for (let i = 0; i < rotated.length; i += 1) {
    codes[i] = Math.max(0, Math.min(levels, Math.round((rotated[i] - min) / scale)));
  }

  return {
    dim: rotated.length,
    method: "turboquant_lite_uint8",
    min,
    scale,
    codes,
    rotation: "legacy_pseudo",
    quantizer: "minmax_uint8",
    residualCorrection: false
  };
}

function encodeNormalQuantile(value: number, codebook: number[], residualCorrection: boolean) {
  const scaled = value * Math.sqrt(codebook.length);
  const approximate = Math.max(0, Math.min(codebook.length - 1, Math.round(normalCdf(scaled) * (codebook.length - 1))));
  let best = nearestCode(value, codebook, approximate);

  if (residualCorrection) {
    const direction = value >= codebook[best] ? 1 : -1;
    const candidate = Math.max(0, Math.min(codebook.length - 1, best + direction));
    if (Math.abs(value - codebook[candidate]) < Math.abs(value - codebook[best])) {
      best = candidate;
    }
  }

  return best;
}

function nearestCode(value: number, codebook: number[], center: number) {
  let best = center;
  let bestError = Math.abs(value - codebook[center]);
  for (let offset = -2; offset <= 2; offset += 1) {
    const index = center + offset;
    if (index < 0 || index >= codebook.length) continue;
    const error = Math.abs(value - codebook[index]);
    if (error < bestError) {
      best = index;
      bestError = error;
    }
  }
  return best;
}

function normalQuantileCodebook(dim: number, levels: number) {
  const key = `${dim}:${levels}`;
  const cached = codebookCache.get(key);
  if (cached) return cached;
  const scale = 1 / Math.sqrt(dim);
  const codebook = Array.from({ length: levels }, (_, index) => inverseNormalCdf((index + 0.5) / levels) * scale);
  codebookCache.set(key, codebook);
  return codebook;
}

function resizeVector(embedding: number[], dim: number) {
  if (embedding.length === dim) return embedding;
  if (embedding.length > dim) return embedding.slice(0, dim);
  return [...embedding, ...Array(dim - embedding.length).fill(0)];
}

function nextPowerOfTwo(value: number) {
  let n = 1;
  while (n < value) n *= 2;
  return n;
}

function fastWalshHadamardTransform(values: number[]) {
  for (let half = 1; half < values.length; half *= 2) {
    for (let start = 0; start < values.length; start += half * 2) {
      for (let index = start; index < start + half; index += 1) {
        const a = values[index];
        const b = values[index + half];
        values[index] = a + b;
        values[index + half] = a - b;
      }
    }
  }
}

function getRotationPlan(dim: number, seed: number) {
  const key = `${dim}:${seed}`;
  const cached = permutationCache.get(key);
  if (cached) return cached;

  const rng = mulberry32(seed);
  const permutation = Array.from({ length: dim }, (_, index) => index);
  for (let i = dim - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [permutation[i], permutation[j]] = [permutation[j], permutation[i]];
  }
  const signs = Array.from({ length: dim }, () => (rng() >= 0.5 ? 1 : -1));
  const plan = { permutation, signs };
  permutationCache.set(key, plan);
  return plan;
}

function getSigns(dim: number, seed: number) {
  const key = `${dim}:${seed}`;
  const cached = signCache.get(key);
  if (cached) return cached;
  const rng = mulberry32(seed);
  const signs = Array.from({ length: dim }, () => (rng() >= 0.5 ? 1 : -1));
  signCache.set(key, signs);
  return signs;
}

function normalCdf(value: number) {
  return 0.5 * (1 + erf(value / Math.SQRT2));
}

function erf(value: number) {
  const sign = value < 0 ? -1 : 1;
  const x = Math.abs(value);
  const t = 1 / (1 + 0.3275911 * x);
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-x * x);
  return sign * y;
}

// Peter J. Acklam's rational approximation. Accuracy is more than enough for a
// deterministic uint8 codebook used as a compact RAG retrieval approximation.
function inverseNormalCdf(p: number) {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const plow = 0.02425;
  const phigh = 1 - plow;

  if (p <= 0 || p >= 1) return p < 0.5 ? -8 : 8;
  if (p < plow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > phigh) {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  const q = p - 0.5;
  const r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
