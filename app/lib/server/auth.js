import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { BackendError } from "../backend-error";
import { ADMIN_COOKIE } from "../admin-session";
import { oauthConfig, verifyOAuthSession } from "../admin-oauth";

export async function hasAdminSession() {
  await connection();
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  try { return verifyOAuthSession(token,oauthConfig()); }
  catch { return false; }
}
export async function requireAdmin() {
  if (!await hasAdminSession()) throw new BackendError("Bitte melde dich mit deinem freigegebenen GitHub-Konto an.",401);
}
export async function clearSession(request) {
  (await cookies()).set(ADMIN_COOKIE,"",{httpOnly:true,sameSite:"strict",path:"/",maxAge:0,secure:new URL(request.url).protocol === "https:"});
}
