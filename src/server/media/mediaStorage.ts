import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const uploadRoot = path.join(process.cwd(), "public", "uploads", "listings");

export async function saveListingPhotoFile(params: {
  listingId: string;
  file: File;
}) {
  const bytes = Buffer.from(await params.file.arrayBuffer());
  const extension = extensionFor(params.file.type);
  const directory = path.join(uploadRoot, params.listingId);
  await mkdir(directory, { recursive: true });
  const id = crypto.randomBytes(12).toString("hex");
  const fileName = `${Date.now()}-${id}.${extension}`;
  const fullPath = path.join(directory, fileName);
  await writeFile(fullPath, bytes);
  const storageKey = `listings/${params.listingId}/${fileName}`;
  const url = `/uploads/${storageKey}`;
  return {
    storageKey,
    url,
    thumbnailUrl: url,
    phash: crypto.createHash("sha256").update(bytes.subarray(0, Math.min(bytes.length, 64_000))).digest("hex")
  };
}

function extensionFor(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}
