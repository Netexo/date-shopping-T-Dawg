import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { BackendError } from "../backend-error";
import { readAdminPassword } from "../admin-config";
import { ADMIN_COOKIE, createAdminSession, SESSION_SECONDS, verifyAdminSession } from "../admin-session";

export function adminPassword() {
  return readAdminPassword();
}

function cookieOptions(request) {
  return { httpOnly: true, sameSite: "strict", path: "/", maxAge: SESSION_SECONDS,
    secure: process.env.ADMIN_COOKIE_SECURE === "true" || new URL(request.url).protocol === "https:" };
}

export async function hasAdminSession() {
  await connection();
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return verifyAdminSession(token, process.env.ADMIN_PASSWORD);
}

export async function requireAdmin() {
  if (!await hasAdminSession()) throw new BackendError("Bitte melde dich an.", 401);
}

export async function saveSession(request) {
  (await cookies()).set(ADMIN_COOKIE, createAdminSession(adminPassword()), cookieOptions(request));
}

export async function clearSession(request) {
  (await cookies()).set(ADMIN_COOKIE, "", { ...cookieOptions(request), maxAge: 0 });
}
