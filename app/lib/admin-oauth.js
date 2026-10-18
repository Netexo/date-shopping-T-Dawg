import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { BackendError } from "./backend-error.js";
import { createAdminSession, verifyAdminSession } from "./admin-session.js";

export const FLOW_COOKIE = "order-a-date.admin-oauth";
export function oauthConfig(environment = process.env) {
  const {ADMIN_GITHUB_CLIENT_ID:clientId,ADMIN_GITHUB_CLIENT_SECRET:clientSecret,ADMIN_GITHUB_USER_ID:userId,ADMIN_SESSION_SECRET:secret,ADMIN_AUTH_ORIGIN:origin} = environment;
  if (!clientId || !clientSecret || !/^\d+$/.test(userId || "") || typeof secret !== "string" || secret.length < 32 || secret.length > 1024) throw new BackendError("Die GitHub-Anmeldung ist noch nicht eingerichtet. Bitte die Admin-OAuth-Umgebungsvariablen konfigurieren.");
  let url;
  try { url = new URL(origin); } catch { throw new BackendError("ADMIN_AUTH_ORIGIN muss die feste Website-Adresse enthalten."); }
  if (url.origin !== origin || (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost","127.0.0.1"].includes(url.hostname)))) throw new BackendError("ADMIN_AUTH_ORIGIN muss eine HTTPS-Adresse ohne Pfad sein (lokal ist HTTP erlaubt).");
  return {clientId,clientSecret,userId,secret,origin,callback:`${origin}/api/admin/callback`,secure:url.protocol === "https:"};
}
const mac = (value,config) => createHmac("sha256",config.secret).update(`admin-oauth-v1\0${value}`).digest("base64url");
const same = (a,b) => typeof a === "string" && typeof b === "string" && a.length === b.length && timingSafeEqual(Buffer.from(a),Buffer.from(b));
const sessionKey = config => createHmac("sha256",config.secret).update(JSON.stringify(["github-admin-v1",config.clientId,config.userId,config.origin])).digest("hex");
export function startOAuth(config, now = Date.now()) {
  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const payload = Buffer.from(JSON.stringify({state,verifier,expires:now+600000})).toString("base64url");
  const url = new URL("https://github.com/login/oauth/authorize");
  url.search = new URLSearchParams({client_id:config.clientId,redirect_uri:config.callback,response_type:"code",scope:"read:user",state,code_challenge:createHash("sha256").update(verifier).digest("base64url"),code_challenge_method:"S256"}).toString();
  return {url:url.toString(),cookie:`${payload}.${mac(payload,config)}`};
}
export function verifyFlow(cookie,state,config,now = Date.now()) {
  try {
    if (typeof cookie !== "string" || cookie.length > 2048) return null;
    const [payload,signature,...extra] = cookie.split(".");
    if (extra.length || !same(signature,mac(payload,config))) return null;
    const flow = JSON.parse(Buffer.from(payload,"base64url").toString("utf8"));
    if (!same(flow.state,state) || !Number.isFinite(flow.expires) || flow.expires <= now || flow.expires > now+600000 || !/^[A-Za-z0-9_-]{43}$/.test(flow.verifier)) return null;
    return flow;
  } catch { return null; }
}
export async function authenticateCode(code,flow,config,send = fetch) {
  if (typeof code !== "string" || !code || code.length > 4096) throw new BackendError("Die Anmeldung ist ungültig. Bitte erneut anmelden.",400);
  const tokenResponse = await send("https://github.com/login/oauth/access_token",{method:"POST",headers:{Accept:"application/json"},cache:"no-store",redirect:"error",signal:AbortSignal.timeout(15000),body:new URLSearchParams({grant_type:"authorization_code",client_id:config.clientId,client_secret:config.clientSecret,code,code_verifier:flow.verifier,redirect_uri:config.callback})});
  if (!tokenResponse.ok) throw new BackendError("Die GitHub-Anmeldung konnte nicht bestätigt werden. Bitte erneut versuchen.",401);
  const token = await tokenResponse.json();
  if (typeof token.access_token !== "string" || !token.access_token) throw new BackendError("Die GitHub-Anmeldung konnte nicht bestätigt werden.",401);
  // Authenticate against GitHub's server, never trust an unverified browser JWT or header.
  const userResponse = await send("https://api.github.com/user",{headers:{Authorization:`Bearer ${token.access_token}`,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28","User-Agent":"Order-a-Date-Admin"},cache:"no-store",redirect:"error",signal:AbortSignal.timeout(15000)});
  if (!userResponse.ok) throw new BackendError("Die GitHub-Identität konnte nicht bestätigt werden.",401);
  const user = await userResponse.json();
  if (!Number.isSafeInteger(user.id) || String(user.id) !== config.userId) throw new BackendError("Dieses GitHub-Konto hat keinen Admin-Zugriff.",403);
  return createAdminSession(sessionKey(config));
}
export function verifyOAuthSession(token,config) {
  return verifyAdminSession(token,sessionKey(config));
}
