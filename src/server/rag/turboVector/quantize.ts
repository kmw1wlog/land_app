export interface TurboVectorConfig {
  dim: number;
  bits: 8;
  seed: number;
  normalize: boolean;
}

export interface QuantizedVector {
  dim: number;
  method: "turboquant_lite_uint8";
  min: number;
  scale: number;
  codes: Uint8Array;
}

export const TURBO_VECTOR_CONFIG: TurboVectorConfig = {
  dim: 384,
  bits: 8,
  seed: 42,
  normalize: true
};

const permutationCache = new Map<string, { permutation: number[]; signs: number[] }>();

export function normalizeVector(v: number[]): number[] {
  const norm = Math.sqrt(v.reduce((acc, x) => acc + x * x, 0)) || 1;
  return v.map((x) => x / norm);
}

export function pseudoRotate(v: number[], seed = 42): number[] {
  const { permutation, signs } = getRotationPlan(v.length, seed);
  return permutation.map((sourceIndex, index) => v[sourceIndex] * signs[index]);
}

export function quantizeVector(
  embedding: number[],
  config: TurboVectorConfig = TURBO_VECTOR_CONFIG
): QuantizedVector {
  const resized = resizeVector(embedding, config.dim);
  const base = config.normalize ? normalizeVector(resized) : resized;
  const rotated = pseudoRotate(base, config.seed);
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
    codes
  };
}

export function dequantizeVector(q: QuantizedVector): number[] {
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

function resizeVector(embedding: number[], dim: number) {
  if (embedding.length === dim) return embedding;
  if (embedding.length > dim) return embedding.slice(0, dim);
  return [...embedding, ...Array(dim - embedding.length).fill(0)];
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
