import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

const ALLOWED_TYPES = new Map<string, string>([
  ["application/pdf", ".pdf"],
  ["application/msword", ".doc"],
  [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".docx",
  ],
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
]);

const MAX_BYTES = 10 * 1024 * 1024;

export type StoredFile = {
  storedName: string;
  originalName: string;
};

export function uploadsDirectory() {
  return UPLOAD_DIR;
}

/**
 * Persists a policy attachment on local disk (MVP stand-in for MinIO/S3).
 * The stored name is opaque so the original filename cannot traverse paths.
 */
export async function savePolicyFile(file: File): Promise<StoredFile> {
  const extension = ALLOWED_TYPES.get(file.type);
  if (!extension) {
    throw new Error("File harus berupa PDF, DOC, DOCX, PNG, atau JPG");
  }
  if (file.size <= 0) {
    throw new Error("File kosong");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Ukuran file maksimal 10 MB");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (extension === ".pdf" && !isRenderablePdf(buffer)) {
    throw new Error("Berkas PDF tidak dapat dibuka. Unggah PDF yang berisi halaman.");
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const storedName = `${randomUUID()}${extension}`;
  await writeFile(path.join(UPLOAD_DIR, storedName), buffer);

  return {
    storedName,
    originalName: sanitizeOriginalName(file.name),
  };
}

export async function readStoredFile(storedName: string) {
  if (!isSafeStoredName(storedName)) {
    throw new Error("Berkas tidak valid");
  }
  const filePath = path.join(UPLOAD_DIR, storedName);
  const data = await readFile(filePath);
  return { data, contentType: contentTypeFor(storedName) };
}

export function isSafeStoredName(storedName: string) {
  return /^[0-9a-f-]{36}\.(pdf|doc|docx|png|jpg)$/i.test(storedName);
}

function sanitizeOriginalName(name: string) {
  const base = path.basename(name).replace(/[^\w.\- ()]/g, "_");
  return base.slice(0, 180) || "dokumen";
}

function contentTypeFor(storedName: string) {
  const extension = path.extname(storedName).toLowerCase();
  switch (extension) {
    case ".pdf":
      return "application/pdf";
    case ".doc":
      return "application/msword";
    case ".docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case ".png":
      return "image/png";
    case ".jpg":
      return "image/jpeg";
    default:
      return "application/octet-stream";
  }
}

export function isRenderablePdf(data: Buffer) {
  if (!data.subarray(0, 5).equals(Buffer.from("%PDF-"))) return false;
  const source = data.toString("latin1");
  return /\/Type\s*\/Page\b/.test(source) && source.includes("startxref");
}

export function canPreview(fileName: string | null | undefined) {
  if (!fileName) return false;
  const extension = path.extname(fileName).toLowerCase();
  return extension === ".pdf" || extension === ".png" || extension === ".jpg";
}
