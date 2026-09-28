import { createHmac, timingSafeEqual } from "crypto";

const DEFAULT_TTL_SECONDS = 5 * 60;

export function fileUrlTtlSeconds() {
  const parsed = Number(process.env.FILE_URL_TTL_SECONDS ?? DEFAULT_TTL_SECONDS);
  if (!Number.isFinite(parsed)) return DEFAULT_TTL_SECONDS;
  return Math.min(60 * 60, Math.max(60, Math.floor(parsed)));
}

function signingSecret() {
  const secret = process.env.FILE_URL_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("FILE_URL_SECRET missing");
  return secret;
}

export function signFileUrl(storedName: string, userId: string, inline: boolean) {
  const exp = Math.floor(Date.now() / 1000) + fileUrlTtlSeconds();
  const sig = signature(storedName, userId, exp, inline);
  const params = new URLSearchParams({
    uid: userId,
    exp: String(exp),
    sig,
  });
  if (inline) params.set("inline", "1");
  return `/api/files/${storedName}?${params.toString()}`;
}

export function verifyFileSignature(input: {
  storedName: string;
  userId: string;
  exp: string;
  sig: string;
  inline: boolean;
}) {
  const exp = Number(input.exp);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  const expected = signature(input.storedName, input.userId, exp, input.inline);
  const left = Buffer.from(expected);
  const right = Buffer.from(input.sig);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function signature(storedName: string, userId: string, exp: number, inline: boolean) {
  return createHmac("sha256", signingSecret())
    .update(`${storedName}\n${userId}\n${exp}\n${inline ? "1" : "0"}`)
    .digest("base64url");
}
