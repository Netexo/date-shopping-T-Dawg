import { productsById, START_BUDGET } from "../shop/lib/products.js";
import { readAppointment } from "../shop/lib/appointment.js";

import { validLocation } from "./location.js";

export class OrderValidationError extends Error {}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const record = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

export function validateOrder(input) {
  const invalid = (message) => { throw new OrderValidationError(message); };
  if (!record(input) || Object.keys(input).some((key) => !["date", "time", "location", "entries", "idempotencyKey", "friendbook"].includes(key))) invalid("Ungültige Bestelldaten.");
  if (typeof input.idempotencyKey !== "string" || !uuid.test(input.idempotencyKey)) invalid("Ungültige Bestellkennung. Bitte lade die Seite neu.");
  if (typeof input.date !== "string" || typeof input.time !== "string" || input.date.slice(0, 4) < "0001" || !readAppointment(input.date, input.time)) invalid("Bitte wähle ein gültiges Datum und eine Uhrzeit.");
  if (!Array.isArray(input.entries) || input.entries.length < 1 || input.entries.length > Object.keys(productsById).length) invalid("Bitte wähle mindestens ein gültiges Produkt.");
  if (!validLocation(input.location)) invalid("Bitte wähle Frankfurt oder Mainz als Standort.");
  if (input.friendbook !== undefined && (!record(input.friendbook) || Object.keys(input.friendbook).some(key => !["id","key"].includes(key)) || typeof input.friendbook.id !== "string" || !uuid.test(input.friendbook.id) || typeof input.friendbook.key !== "string" || !uuid.test(input.friendbook.key))) invalid("Ungültige Freundesbuch-Zuordnung.");
  const seen = new Set();
  const items = input.entries.map((entry) => {
    if (!record(entry) || typeof entry.id !== "string" || !Object.hasOwn(productsById, entry.id)
      || Object.keys(entry).some((key) => !["id", "variantId"].includes(key)) || seen.has(entry.id)) invalid("Die Produktauswahl ist ungültig oder enthält doppelte Produkte.");
    seen.add(entry.id);
    const product = productsById[entry.id];
    let variant;
    if (product.variants) {
      variant = product.variants.find((item) => item.id === entry.variantId);
      if (!variant) invalid("Bitte wähle eine gültige Restaurantart.");
    } else if (entry.variantId !== undefined) invalid("Dieses Produkt hat keine Varianten.");
    return { id: product.id, name: variant ? `${product.name} – ${variant.name}` : product.name,
      credits: variant ? variant.points : product.points, ...(variant ? { variantId: variant.id } : {}) };
  });
  const spent = items.reduce((sum, item) => sum + item.credits, 0);
  if (spent > START_BUDGET) invalid("Deine Auswahl überschreitet das Guthaben von 100 Credits.");
  return { idempotencyKey: input.idempotencyKey.toLowerCase(), date: input.date, time: input.time, location: input.location, ...(input.friendbook ? {friendbook:input.friendbook} : {}), items, spent, remaining: START_BUDGET - spent };
}
