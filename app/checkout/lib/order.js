import { cartSummary, restoreCart } from "../../shop/lib/cart.js";
import { readAppointment } from "../../shop/lib/appointment.js";

import { validLocation } from "../../lib/location.js";

export const ORDER_STORAGE_KEY = "date-shopping.checkout.v4";

export function checkoutDraft(appointment, entries, location = appointment?.location, friendbook = null) {
  const date = readAppointment(appointment?.date, appointment?.time);
  const cleanEntries = restoreCart(entries);
  const summary = cartSummary(cleanEntries);
  if (!date || !validLocation(location) || summary.count === 0) return null;
  // Cart order does not affect an order's identity, but restaurant choice does.
  const canonicalEntries = [...cleanEntries].sort((a, b) => a.id.localeCompare(b.id));
  return {
    signature: JSON.stringify([date.date, date.time, canonicalEntries, location, ...(friendbook ? [friendbook] : [])]),
    ...(friendbook ? {friendbook} : {}),
    location,
    appointment: date,
    entries: cleanEntries,
    items: summary.items.map(({ id, name, points, variantId }) => ({ id, name, credits: points, ...(variantId ? { variantId } : {}) })),
    spent: summary.spent,
    remaining: summary.remaining,
  };
}

function savedRequests(storage) {
  try {
    const saved = JSON.parse(storage.getItem(ORDER_STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved.filter((item) => item && typeof item.signature === "string" && typeof item.idempotencyKey === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(item.idempotencyKey)) : [];
  } catch { return []; }
}

function completedReceipt(receipt, draft) {
  const appointment = readAppointment(receipt?.date, receipt?.time);
  if (!receipt || (draft.friendbook && receipt.friendbookId !== draft.friendbook.id) || receipt.location !== draft.location || receipt.status !== "completed" || !/^[0-9a-f-]{36}$/i.test(receipt.id || "")
    || !appointment || appointment.date !== draft.appointment.date || appointment.time !== draft.appointment.time
    || !Number.isInteger(receipt.spent) || receipt.spent < 1 || receipt.spent > 100 || receipt.remaining !== 100 - receipt.spent) return null;
  return { ...draft, id: receipt.id, appointment, spent: receipt.spent, remaining: receipt.remaining,
    status: "completed", backend: "vercel-blob", completedAt: receipt.created_at };
}

export function findCompletedOrder(storage, draft) {
  if (!draft?.appointment) return null;
  const request = savedRequests(storage).find((item) => item.signature === draft.signature);
  return request?.receipt ? completedReceipt(request.receipt, draft) : null;
}

export async function completeOrder(storage, draft, send = fetch) {
  if (!draft || checkoutDraft(draft.appointment, draft.entries, draft.location, draft.friendbook)?.signature !== draft.signature) throw new Error("Bitte prüfe deine Datum- und Produktauswahl.");
  const requests = savedRequests(storage);
  let request = requests.find((item) => item.signature === draft.signature);
  if (!request) {
    request = { signature: draft.signature, idempotencyKey: crypto.randomUUID() };
    requests.push(request);
    // Persist the retry key before sending. Lost responses cannot create duplicates.
    try { storage.setItem(ORDER_STORAGE_KEY, JSON.stringify(requests)); }
    catch { throw new Error("Die Bestellkennung konnte nicht gespeichert werden. Bitte erlaube den lokalen Browserspeicher und versuche es erneut."); }
  }
  if (request.receipt) {
    const completed = completedReceipt(request.receipt, draft);
    if (completed) return completed;
  }
  let response;
  try {
    response = await send("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...(draft.friendbook ? {friendbook:draft.friendbook} : {}), location: draft.location, date: draft.appointment.date, time: draft.appointment.time,
        entries: draft.entries, idempotencyKey: request.idempotencyKey }) });
  } catch { throw new Error("Keine Verbindung zum Server. Bitte versuche es erneut. Deine Bestellkennung bleibt erhalten."); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Deine Bestellung konnte nicht gespeichert werden. Bitte versuche es erneut.");
  const completed = completedReceipt(data.receipt, draft);
  if (!completed) throw new Error("Die Speicherung konnte nicht bestätigt werden. Bitte versuche es erneut.");
  request.receipt = data.receipt;
  // The server has already confirmed the private Blob write; a failed receipt cache is harmless.
  // The persisted request key still makes the next retry idempotent.
  try { storage.setItem(ORDER_STORAGE_KEY, JSON.stringify(requests)); } catch { /* Private Blob storage is authoritative. */ }
  return completed;
}
