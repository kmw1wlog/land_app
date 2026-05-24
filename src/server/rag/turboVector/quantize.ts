export interface TurboVectorConfig {
  dim: number;
  paddedDim: number;
  bits: 8;
  seed: number;
  normalize: boolean;
  rotation: "rht_pad_power2" | "signed_permutation_legacy";
  quantizer: "normal_clipped_uint8" | "minmax_uint8_legacy";
  residualCorrection: boolean;
}

export type QuantizedMethod =
  | "turboquant_lite_uint8"
  | "turboquant_mse_rht_uint8"
  | "turboquant_prod_rht_uint8_qjl";

export interface QuantizedVector {
  dim: number;
  paddedDim: number;
  method: QuantizedMethod;
  min: number;
  scale: number;
  codebookId: string;
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
  rotation: "rht_pad_power2",
  quantizer: "normal_clipped_uint8",
  residualCorrection: true
};

const permutationCache = new Map<string, { permutation: number[]; inversePermutation: number[]; signs: number[] }>();
const NORMAL_CLIP = 3.5;
const EPS = 1e-12;

export function normalizeVector(v: number[]): number[] {
  const norm = Math.sqrt(v.reduce((acc, x) => acc + x * x, 0)) || 1;
  return v.map((x) => x / norm);
}

/**
 * Legacy deterministic signed permutation kept for backwards-compatible documentation/tests.
 * New vectors use randomized Hadamard rotation through applyRandomizedHadamardRotation().
 */
export function pseudoRotate(v: number[], seed = 42): number[] {
  const { permutation, signs } = getRotationPlan(v.length, seed);
  return permutation.map((sourceIndex, index) => v[sourceIndex] * signs[index]);
}

export function applyRandomizedHadamardRotation(
  vector: number[],
  seed = TURBO_VECTOR_CONFIG.seed,
  paddedDim = TURBO_VECTOR_CONFIG.paddedDim
): number[] {
  const padded = padVector(vector, paddedDim);
  const { permutation, signs } = getRotationPlan(paddedDim, seed);
  const signed = padded.map((value, index) => value * signs[index]);
  const rotated = fastHadamardTransform(signed).map((value) => value / Math.sqrt(paddedDim));
  return permutation.map((sourceIndex) => rotated[sourceIndex]);
}

export function invertRandomizedHadamardRotation(
  rotated: number[],
  seed = TURBO_VECTOR_CONFIG.seed,
  originalDim = TURBO_VECTOR_CONFIG.dim,
  paddedDim = TURBO_VECTOR_CONFIG.paddedDim
): number[] {
  const { inversePermutation, signs } = getRotationPlan(paddedDim, seed);
  const unpermuted = Array(paddedDim).fill(0) as number[];
  for (let i = 0; i < Math.min(rotated.length, paddedDim); i += 1) {
    unpermuted[inversePermutation[i]] = rotated[i];
  }
  const unscaled = unpermuted.map((value) => value * Math.sqrt(paddedDim));
  const hadamard = fastHadamardTransform(unscaled).map((value) => value / paddedDim);
  return hadamard.map((value, index) => value * signs[index]).slice(0, originalDim);
}

export function fastHadamardTransform(values: number[]): number[] {
  if (!isPowerOfTwo(values.length)) {
    throw new Error(`Hadamard input length must be a power of two. Received ${values.length}.`);
  }
  const out = [...values];
  for (let size = 1; size < out.length; size *= 2) {
    for (let start = 0; start < out.length; start += size * 2) {
      for (let offset = 0; offset < size; offset += 1) {
        const a = out[start + offset];
        const b = out[start + offset + size];
        out[start + offset] = a + b;
        out[start + offset + size] = a - b;
      }
    }
  }
  return out;
}

export function quantizeVector(
  embedding: number[],
  config: TurboVectorConfig = TURBO_VECTOR_CONFIG
): QuantizedVector {
  if (config.rotation === "signed_permutation_legacy" || config.quantizer === "minmax_uint8_legacy") {
    return quantizeVectorLegacy(embedding, config);
  }

  const resized = resizeVector(embedding, config.dim);
  const base = config.normalize ? normalizeVector(resized) : resized;
  const rotated = applyRandomizedHadamardRotation(base, config.seed, config.paddedDim);
  const codes = quantizeNormalClipped(rotated, config.bits, config.paddedDim);
  const reconstructedRotated = dequantizeNormalClipped(codes, config.bits, config.paddedDim);
  const reconstructed = normalizeVector(
    invertRandomizedHadamardRotation(reconstructedRotated, config.seed, config.dim, config.paddedDim)
  );
  const residual = subtractVectors(base, reconstructed);
  const residualNorm = vectorNorm(residual);
  const residualSigns =
    config.residualCorrection && residualNorm > EPS
      ? encodeResidualQjl(residual, residualNorm, config.seed + 104729, config.paddedDim)
      : undefined;

  return {
    dim: config.dim,
    paddedDim: config.paddedDim,
    method: residualSigns ? "turboquant_prod_rht_uint8_qjl" : "turboquant_mse_rht_uint8",
    min: -NORMAL_CLIP / Math.sqrt(config.paddedDim),
    scale: (2 * NORMAL_CLIP) / ((2 ** config.bits - 1) * Math.sqrt(config.paddedDim)),
    codebookId: `normal_clipped_${config.bits}bit_rht_${config.paddedDim}`,
    codes,
    residualNorm: residualSigns ? residualNorm : undefined,
    residualMethod: residualSigns ? "qjl_sign_rht" : undefined,
    residualSigns
  };
}

export function dequantizeVector(q: QuantizedVector): number[] {
  if (q.method === "turboquant_lite_uint8" || q.codebookId === "legacy_minmax") {
    return Array.from(q.codes).map((code) => q.min + code * q.scale);
  }

  const paddedDim = q.paddedDim ?? q.codes.length;
  const rotated = dequantizeNormalClipped(q.codes, 8, paddedDim);
  const correctedRotated =
    q.residualSigns && q.residualNorm && q.residualNorm > EPS
      ? addVectors(rotated, decodeResidualQjlCorrection(q.residualSigns, q.residualNorm, TURBO_VECTOR_CONFIG.seed + 104729, paddedDim))
      : rotated;
  return normalizeVector(
    invertRandomizedHadamardRotation(correctedRotated, TURBO_VECTOR_CONFIG.seed, q.dim, paddedDim)
  );
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

export function encodeResidualQjl(
  residual: number[],
  residualNorm: number,
  seed: number,
  paddedDim: number
): Uint8Array {
  const normalizedResidual = residual.map((value) => value / (residualNorm || 1));
  const rotatedResidual = applyRandomizedHadamardRotation(normalizedResidual, seed, paddedDim);
  const bytes = new Uint8Array(Math.ceil(rotatedResidual.length / 8));
  rotatedResidual.forEach((value, index) => {
    if (value >= 0) bytes[Math.floor(index / 8)] |= 1 << (index % 8);
  });
  return bytes;
}

export function decodeResidualQjlCorrection(
  signs: Uint8Array,
  residualNorm: number,
  seed: number,
  paddedDim: number
): number[] {
  const signedRotated = Array.from({ length: paddedDim }, (_, index) =>
    signs[Math.floor(index / 8)] & (1 << (index % 8)) ? 1 : -1
  );
  const correctionScale = (Math.sqrt(Math.PI / 2) * residualNorm) / paddedDim;
  return signedRotated.map((value) => value * correctionScale);
}

function quantizeVectorLegacy(embedding: number[], config: TurboVectorConfig): QuantizedVector {
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
    paddedDim: rotated.length,
    method: "turboquant_lite_uint8",
    min,
    scale,
    codebookId: "legacy_minmax",
    codes
  };
}

function quantizeNormalClipped(rotated: number[], bits: number, paddedDim: number): Uint8Array {
  const levels = 2 ** bits - 1;
  const codes = new Uint8Array(rotated.length);
  for (let i = 0; i < rotated.length; i += 1) {
    const standardized = clamp(rotated[i] * Math.sqrt(paddedDim), -NORMAL_CLIP, NORMAL_CLIP);
    codes[i] = Math.max(0, Math.min(levels, Math.round(((standardized + NORMAL_CLIP) / (2 * NORMAL_CLIP)) * levels)));
  }
  return codes;
}

function dequantizeNormalClipped(codes: Uint8Array, bits: number, paddedDim: number): number[] {
  const levels = 2 ** bits - 1;
  return Array.from(codes).map((code) => {
    const standardized = (code / levels) * (2 * NORMAL_CLIP) - NORMAL_CLIP;
    return standardized / Math.sqrt(paddedDim);
  });
}

function resizeVector(embedding: number[], dim: number) {
  if (embedding.length === dim) return embedding;
  if (embedding.length > dim) return embedding.slice(0, dim);
  return [...embedding, ...Array(dim - embedding.length).fill(0)];
}

function padVector(embedding: number[], paddedDim: number) {
  if (embedding.length === paddedDim) return embedding;
  if (embedding.length > paddedDim) return embedding.slice(0, paddedDim);
  return [...embedding, ...Array(paddedDim - embedding.length).fill(0)];
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
  const inversePermutation = Array(dim).fill(0) as number[];
  permutation.forEach((sourceIndex, outputIndex) => {
    inversePermutation[sourceIndex] = outputIndex;
  });
  const signs = Array.from({ length: dim }, () => (rng() >= 0.5 ? 1 : -1));
  const plan = { permutation, inversePermutation, signs };
  permutationCache.set(key, plan);
  return plan;
}

function vectorNorm(v: number[]) {
  return Math.sqrt(v.reduce((acc, value) => acc + value * value, 0));
}

function addVectors(a: number[], b: number[]) {
  const n = Math.min(a.length, b.length);
  return Array.from({ length: n }, (_, index) => a[index] + b[index]);
}

function subtractVectors(a: number[], b: number[]) {
  const n = Math.min(a.length, b.length);
  return Array.from({ length: n }, (_, index) => a[index] - b[index]);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function isPowerOfTwo(value: number) {
  return value > 0 && (value & (value - 1)) === 0;
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
