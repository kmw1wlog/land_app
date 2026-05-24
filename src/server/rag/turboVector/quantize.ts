export type TurboVectorRotation = "signed_permutation_legacy" | "rht_pad512";
export type TurboVectorQuantizer = "minmax_uniform_uint8" | "normal_quantile_uint8";

export interface TurboVectorConfig {
  dim: number;
  paddedDim: number;
  bits: 8;
  seed: number;
  normalize: boolean;
  rotation: TurboVectorRotation;
  quantizer: TurboVectorQuantizer;
  residualCorrection: boolean;
}

export interface QuantizedVector {
  dim: number;
  paddedDim: number;
  method: "turboquant_lite_uint8" | "turboquant_mse_rht_uint8" | "turboquant_prod_rht_uint8_qjl";
  min: number;
  scale: number;
  codebookId: string;
  rotationMethod: TurboVectorRotation;
  codes: Uint8Array;
  residualNorm?: number;
  residualMethod?: "qjl_sign_rht";
  residualSigns?: Uint8Array;
}

export const TURBO_VECTOR_CONFIG: TurboVectorConfig = {
  dim: 384,
  paddedDim: 512,
  bits: 8,
  seed: 42,
  normalize: true,
  rotation: "rht_pad512",
  quantizer: "normal_quantile_uint8",
  residualCorrection: true
};

export const LEGACY_TURBO_VECTOR_CONFIG: TurboVectorConfig = {
  dim: 384,
  paddedDim: 384,
  bits: 8,
  seed: 42,
  normalize: true,
  rotation: "signed_permutation_legacy",
  quantizer: "minmax_uniform_uint8",
  residualCorrection: false
};

const rotationPlanCache = new Map<string, { permutation: number[]; inversePermutation: number[]; signs: number[] }>();
const normalCodebookCache = new Map<number, { thresholds: number[]; centroids: number[]; id: string }>();

export function normalizeVector(v: number[]): number[] {
  const norm = Math.sqrt(v.reduce((acc, x) => acc + x * x, 0)) || 1;
  return v.map((x) => x / norm);
}

/**
 * Legacy transform retained for compatibility with the earlier MVP implementation.
 * It is a signed permutation, not a full orthogonal mixing transform.
 */
export function pseudoRotate(v: number[], seed = 42): number[] {
  const { permutation, signs } = getRotationPlan(v.length, seed);
  return permutation.map((sourceIndex, index) => v[sourceIndex] * signs[index]);
}

export function applyRandomizedHadamardRotation(v: number[], config: TurboVectorConfig = TURBO_VECTOR_CONFIG): number[] {
  const padded = padVector(v, config.paddedDim);
  const { permutation, signs } = getRotationPlan(config.paddedDim, config.seed);
  const signed = padded.map((value, index) => value * signs[index]);
  const transformed = fastHadamardTransform(signed).map((value) => value / Math.sqrt(config.paddedDim));
  return permutation.map((sourceIndex) => transformed[sourceIndex]);
}

export function invertRandomizedHadamardRotation(z: number[], originalDim: number, config: TurboVectorConfig = TURBO_VECTOR_CONFIG): number[] {
  const { inversePermutation, signs } = getRotationPlan(config.paddedDim, config.seed);
  const unpermuted = Array(config.paddedDim).fill(0) as number[];
  for (let index = 0; index < Math.min(z.length, config.paddedDim); index += 1) {
    unpermuted[inversePermutation[index]] = z[index];
  }
  const hadamard = fastHadamardTransform(unpermuted).map((value) => value / Math.sqrt(config.paddedDim));
  const unsigned = hadamard.map((value, index) => value * signs[index]);
  return unsigned.slice(0, originalDim);
}

export function quantizeVector(
  embedding: number[],
  config: TurboVectorConfig = TURBO_VECTOR_CONFIG
): QuantizedVector {
  const resized = resizeVector(embedding, config.dim);
  const base = config.normalize ? normalizeVector(resized) : resized;
  const rotated = config.rotation === "rht_pad512" ? applyRandomizedHadamardRotation(base, config) : pseudoRotate(base, config.seed);

  if (config.quantizer === "minmax_uniform_uint8") {
    return quantizeMinMax(rotated, config);
  }

  const quantized = quantizeNormalCodebook(rotated, config);
  if (!config.residualCorrection) return quantized;
  const reconstructed = dequantizeVector(quantized);
  const residual = rotated.map((value, index) => value - (reconstructed[index] ?? 0));
  const residualNorm = Math.sqrt(residual.reduce((acc, value) => acc + value * value, 0));
  if (!Number.isFinite(residualNorm) || residualNorm < 1e-12) return quantized;
  return {
    ...quantized,
    method: "turboquant_prod_rht_uint8_qjl",
    residualNorm,
    residualMethod: "qjl_sign_rht",
    residualSigns: encodeResidualSigns(residual)
  };
}

export function dequantizeVector(q: QuantizedVector): number[] {
  if (q.codebookId.startsWith("normal_quantile")) {
    const bits = Number(q.codebookId.match(/(\d+)bit/)?.[1] ?? 8) as 8;
    const codebook = getNormalQuantileCodebook(bits);
    return Array.from(q.codes).map((code) => (codebook.centroids[code] ?? 0) / Math.sqrt(q.paddedDim));
  }
  return Array.from(q.codes).map((code) => q.min + code * q.scale);
}

export function correctedVectorFromQuantized(q: QuantizedVector): number[] {
  const base = dequantizeVector(q);
  if (!q.residualSigns?.length || !q.residualNorm) return base;
  const signs = decodeResidualSigns(q.residualSigns, base.length);
  const correctionScale = (q.residualNorm * Math.sqrt(Math.PI / 2)) / Math.sqrt(base.length || 1);
  return normalizeVector(base.map((value, index) => value + (signs[index] ?? 0) * correctionScale));
}

export function dot(a: number[], b: number[]): number {
  let total = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i += 1) total += a[i] * b[i];
  return total;
}

export function cosineApproxFromQuantized(a: QuantizedVector, b: QuantizedVector): number {
  const da = correctedVectorFromQuantized(a);
  const db = correctedVectorFromQuantized(b);
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

export function encodeResidualSigns(residual: number[]): Uint8Array {
  const bytes = new Uint8Array(Math.ceil(residual.length / 8));
  for (let index = 0; index < residual.length; index += 1) {
    if (residual[index] >= 0) bytes[Math.floor(index / 8)] |= 1 << (index % 8);
  }
  return bytes;
}

export function decodeResidualSigns(bytes: Uint8Array, dim: number): number[] {
  return Array.from({ length: dim }, (_, index) => {
    const bit = (bytes[Math.floor(index / 8)] >> (index % 8)) & 1;
    return bit ? 1 : -1;
  });
}

export function fastHadamardTransform(values: number[]): number[] {
  const n = values.length;
  if (n === 0 || (n & (n - 1)) !== 0) {
    throw new Error(`Hadamard transform requires power-of-two length; received ${n}`);
  }
  const output = [...values];
  for (let size = 1; size < n; size *= 2) {
    for (let start = 0; start < n; start += size * 2) {
      for (let offset = 0; offset < size; offset += 1) {
        const left = output[start + offset];
        const right = output[start + offset + size];
        output[start + offset] = left + right;
        output[start + offset + size] = left - right;
      }
    }
  }
  return output;
}

export function getNormalQuantileCodebook(bits = 8) {
  const cached = normalCodebookCache.get(bits);
  if (cached) return cached;
  const levels = 2 ** bits;
  const thresholds = Array.from({ length: levels - 1 }, (_, index) => inverseNormalCdf((index + 1) / levels));
  const centroids = Array.from({ length: levels }, (_, index) => inverseNormalCdf((index + 0.5) / levels));
  const codebook = { thresholds, centroids, id: `normal_quantile_${bits}bit_v1` };
  normalCodebookCache.set(bits, codebook);
  return codebook;
}

function quantizeNormalCodebook(rotated: number[], config: TurboVectorConfig): QuantizedVector {
  const codebook = getNormalQuantileCodebook(config.bits);
  const codes = new Uint8Array(rotated.length);
  const standardScale = Math.sqrt(config.paddedDim);
  for (let index = 0; index < rotated.length; index += 1) {
    codes[index] = findBucket(rotated[index] * standardScale, codebook.thresholds);
  }
  return {
    dim: config.dim,
    paddedDim: config.paddedDim,
    method: "turboquant_mse_rht_uint8",
    min: 0,
    scale: 0,
    codebookId: codebook.id,
    rotationMethod: config.rotation,
    codes
  };
}

function quantizeMinMax(rotated: number[], config: TurboVectorConfig): QuantizedVector {
  const min = Math.min(...rotated);
  const max = Math.max(...rotated);
  const levels = 2 ** config.bits - 1;
  const scale = max === min ? 1 : (max - min) / levels;
  const codes = new Uint8Array(rotated.length);
  for (let i = 0; i < rotated.length; i += 1) {
    codes[i] = Math.max(0, Math.min(levels, Math.round((rotated[i] - min) / scale)));
  }
  return {
    dim: config.dim,
    paddedDim: rotated.length,
    method: "turboquant_lite_uint8",
    min,
    scale,
    codebookId: "minmax_uniform_uint8",
    rotationMethod: config.rotation,
    codes
  };
}

function findBucket(value: number, thresholds: number[]) {
  let low = 0;
  let high = thresholds.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (value <= thresholds[mid]) high = mid;
    else low = mid + 1;
  }
  return low;
}

function padVector(embedding: number[], dim: number) {
  if (embedding.length === dim) return [...embedding];
  if (embedding.length > dim) return embedding.slice(0, dim);
  return [...embedding, ...Array(dim - embedding.length).fill(0)];
}

function resizeVector(embedding: number[], dim: number) {
  if (embedding.length === dim) return [...embedding];
  if (embedding.length > dim) return embedding.slice(0, dim);
  return [...embedding, ...Array(dim - embedding.length).fill(0)];
}

function getRotationPlan(dim: number, seed: number) {
  const key = `${dim}:${seed}`;
  const cached = rotationPlanCache.get(key);
  if (cached) return cached;

  const rng = mulberry32(seed);
  const permutation = Array.from({ length: dim }, (_, index) => index);
  for (let i = dim - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [permutation[i], permutation[j]] = [permutation[j], permutation[i]];
  }
  const inversePermutation = Array(dim).fill(0) as number[];
  permutation.forEach((sourceIndex, index) => {
    inversePermutation[sourceIndex] = index;
  });
  const signs = Array.from({ length: dim }, () => (rng() >= 0.5 ? 1 : -1));
  const plan = { permutation, inversePermutation, signs };
  rotationPlanCache.set(key, plan);
  return plan;
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

function inverseNormalCdf(p: number): number {
  if (p <= 0 || p >= 1) {
    if (p === 0) return Number.NEGATIVE_INFINITY;
    if (p === 1) return Number.POSITIVE_INFINITY;
    throw new Error(`p must be in [0,1]; received ${p}`);
  }

  const a = [
    -3.969683028665376e+01,
    2.209460984245205e+02,
    -2.759285104469687e+02,
    1.383577518672690e+02,
    -3.066479806614716e+01,
    2.506628277459239e+00
  ];
  const b = [
    -5.447609879822406e+01,
    1.615858368580409e+02,
    -1.556989798598866e+02,
    6.680131188771972e+01,
    -1.328068155288572e+01
  ];
  const c = [
    -7.784894002430293e-03,
    -3.223964580411365e-01,
    -2.400758277161838e+00,
    -2.549732539343734e+00,
    4.374664141464968e+00,
    2.938163982698783e+00
  ];
  const d = [
    7.784695709041462e-03,
    3.224671290700398e-01,
    2.445134137142996e+00,
    3.754408661907416e+00
  ];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p <= pHigh) {
    const q = p - 0.5;
    const r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  const q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
}
