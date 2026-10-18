export const ENTRY_REFERENCE_KEY = "order-a-date.friendbook.reference.v1";
export function loadEntryReference(storage) {
  const value = JSON.parse(storage.getItem(ENTRY_REFERENCE_KEY) || "null");
  return value && typeof value.id === "string" && typeof value.key === "string" ? value : null;
}
function remember(storage, receipt) {
  try { storage.setItem(ENTRY_REFERENCE_KEY,JSON.stringify({id:receipt.id,key:receipt.key})); }
  catch { throw new Error("Dein Eintrag ist gespeichert, aber die Zuordnung konnte nicht im Browser gespeichert werden. Bitte erlaube den Browserspeicher und versuche es erneut."); }
  return receipt;
}
const KEY = "order-a-date.friendbook.requests.v1";

export async function submitEntry(storage, payload, send = fetch) {
  const signature = JSON.stringify(payload);
  let requests;
  try { requests = JSON.parse(storage.getItem(KEY) || "[]"); }
  catch { throw new Error("Deine Eintragskennung konnte nicht geladen werden. Bitte erlaube den Browserspeicher."); }
  if (!Array.isArray(requests)) throw new Error("Deine gespeicherten Eintragskennungen sind ungültig.");
  let request = requests.find(item => item.signature === signature);
  if (!request) {
    request = {signature,idempotencyKey:crypto.randomUUID()};
    requests.push(request);
    try { storage.setItem(KEY,JSON.stringify(requests)); }
    catch { throw new Error("Deine Eintragskennung konnte nicht gespeichert werden. Bitte erlaube den Browserspeicher."); }
  }
  if (request.receipt?.key) return remember(storage,request.receipt);
  let response;
  try {
    response = await send("/api/friendbook",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...payload,idempotencyKey:request.idempotencyKey})});
  } catch { throw new Error("Keine Verbindung zum Server. Bitte versuche es erneut. Dein Entwurf bleibt erhalten."); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Dein Eintrag konnte nicht gespeichert werden. Bitte versuche es erneut.");
  if (data.receipt?.status !== "completed" || typeof data.receipt.id !== "string" || typeof data.receipt.key !== "string" || !Number.isFinite(Date.parse(data.receipt.created_at))) throw new Error("Die Speicherung konnte nicht bestätigt werden. Bitte versuche es erneut.");
  request.receipt = data.receipt;
  try { storage.setItem(KEY,JSON.stringify(requests)); } catch { /* Server acknowledgement remains authoritative. */ }
  return remember(storage,data.receipt);
}
