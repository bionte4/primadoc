import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const SALT = "prismadoc-integration";

function secretKey() {
  const secret = process.env.NEXTAUTH_SECRET?.trim();
  if (!secret) return null;
  return scryptSync(secret, SALT, 32);
}

export function encryptSecret(plain: string) {
  const key = secretKey();
  if (!key) throw new Error("NEXTAUTH_SECRET belum diisi.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptSecret(payload: string) {
  const key = secretKey();
  if (!key) return null;
  try {
    const buf = Buffer.from(payload, "base64");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const data = buf.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
