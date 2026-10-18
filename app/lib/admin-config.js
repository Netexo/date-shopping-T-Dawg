import { BackendError } from "./backend-error.js";

// Called for each login request; never capture the password at module/build time.
export function readAdminPassword(environment = process.env) {
  const password = environment.ADMIN_PASSWORD;
  if (typeof password !== "string" || !password.length) {
    throw new BackendError("ADMIN_PASSWORD fehlt in der Server-Umgebung. Lokal: in .env.local setzen und den Server neu starten. Auf Vercel: im richtigen Projekt für die Umgebung dieses Deployments (Production oder Preview) setzen und anschließend neu deployen.");
  }
  if (password.length < 16 || password.length > 1024) {
    throw new BackendError("ADMIN_PASSWORD muss zwischen 16 und 1024 Zeichen lang sein. Bitte den Wert in der Server-Umgebung korrigieren; auf Vercel danach für die betreffende Umgebung neu deployen.");
  }
  return password;
}
