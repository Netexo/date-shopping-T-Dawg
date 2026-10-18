import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const SESSION_SECONDS = 8 * 60 * 60;
export const ADMIN_COOKIE = "ds-admin-session";
const digest = (value) => createHash("sha256").update(value).digest();
const signature = (payload, password) => createHmac("sha256", digest(`date-shopping-admin-v1\0${password}`)).update(payload).digest("base64url");

export function passwordMatches(input, password) {
  return typeof input === "string" && input.length <= 1024 && typeof password === "string"
    && password.length >= 16 && password.length <= 1024 && timingSafeEqual(digest(input), digest(password));
}

export function createAdminSession(password, now = Date.now()) {
  if (typeof password !== "string" || password.length < 16 || password.length > 1024) throw new Error("Admin password not configured");
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(now / 1000) + SESSION_SECONDS, nonce: randomBytes(16).toString("hex") })).toString("base64url");
  return `${payload}.${signature(payload, password)}`;
}

export function verifyAdminSession(token, password, now = Date.now()) {
  if (typeof token !== "string" || token.length > 1024 || typeof password !== "string" || password.length < 16 || password.length > 1024) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payload, signed] = parts;
  const expected = signature(payload, password);
  if (!/^[A-Za-z0-9_-]{43}$/.test(signed) || signed.length !== expected.length || !timingSafeEqual(Buffer.from(signed), Buffer.from(expected))) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const seconds = Math.floor(now / 1000);
    return Number.isInteger(data.exp) && data.exp > seconds && data.exp <= seconds + SESSION_SECONDS && /^[0-9a-f]{32}$/.test(data.nonce);
  } catch { return false; }
}
