import { json } from "../../../lib/server/http";

// Password login has been retired; only the GitHub OAuth flow can create a session.
export async function POST() {
  return json({error:"Die Passwortanmeldung wurde entfernt. Bitte über /admin mit GitHub anmelden."},410);
}
