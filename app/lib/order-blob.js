import { createHash, randomUUID } from "node:crypto";
import { validateOrder } from "./order-validation.js";
import { productsById } from "../shop/lib/products.js";
import { BackendError } from "./backend-error.js";
import { validOrderRecord, orderReceipt, publicOrder } from "./order-record.js";

export const ORDER_BLOB_PREFIX = "date-shopping/orders/v1/";
const orderPath = new RegExp(`^${ORDER_BLOB_PREFIX}[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\.json$`);

// The SDK and token are injected by a server-only module; neither reaches the client.
export function createOrderBlobStore({ put, get, list }, token, friendbookStore = null) {
  if (typeof token !== "string" || !token.trim()) throw new BackendError("Der Bestellspeicher ist noch nicht eingerichtet: BLOB_READ_WRITE_TOKEN fehlt. Bitte verbinde den vorhandenen privaten Blob Store mit dem Vercel-Projekt und prüfe die Umgebungsvariable.");

  async function read(pathname) {
    try {
      const result = await get(pathname, { access: "private", token, useCache: false, abortSignal: AbortSignal.timeout(15000) });
      if (!result) return null;
      if (result.statusCode !== 200 || !result.stream) throw new Error("Missing content");
      const order = await new Response(result.stream).json();
      if (!validOrderRecord(order) || `${ORDER_BLOB_PREFIX}${order.idempotencyKey}.json` !== pathname) throw new Error("Invalid order snapshot");
      return order;
    } catch {
      throw new BackendError("Die gespeicherten Bestellungen konnten nicht aus dem privaten Blob-Speicher geladen werden. Bitte versuche es erneut.");
    }
  }

  function replay(existing, hash) {
    if (existing.requestHash !== hash) throw new BackendError("Diese Bestellkennung gehört zu einer anderen Auswahl. Bitte prüfe deine Bestellung.", 409);
    return orderReceipt(existing);
  }

  return {
    async create(input) {
      const validated = validateOrder(input);
      if (friendbookStore) {
        const entry = await friendbookStore.resolve(validated.friendbook);
        if (entry.location !== validated.location || (entry.date && (entry.date !== validated.date || entry.time !== validated.time))) throw new BackendError("Standort oder Termin stimmen nicht mit deinem Freundesbuch überein. Bitte bestätige deinen Eintrag erneut.",400);
      }
      const canonical = { date: validated.date, time: validated.time, location: validated.location,
        ...(validated.friendbook ? {friendbook:validated.friendbook} : {}),
        entries: validated.items.map(({ id, variantId }) => variantId ? { id, variantId } : { id }).sort((a, b) => a.id.localeCompare(b.id)) };
      const requestHash = createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
      const pathname = `${ORDER_BLOB_PREFIX}${validated.idempotencyKey}.json`;
      const existing = await read(pathname);
      if (existing) return replay(existing, requestHash);
      const {friendbook: reference, ...snapshot} = validated;
      const order = { ...snapshot,
        ...(reference ? {friendbookId:reference.id,items:validated.items.map(item => ({...item,category:productsById[item.id].category}))} : {}), id: randomUUID(), requestHash, created_at: new Date().toISOString(), status: "completed" };
      try {
        await put(pathname, JSON.stringify(order, null, 2), {
          access: "private", token, contentType: "application/json", addRandomSuffix: false,
          allowOverwrite: false, abortSignal: AbortSignal.timeout(15000),
        });
      } catch {
        // Another instance may have won, or storage succeeded but its response was lost.
        // A consistent read returns the winning receipt; never overwrite it.
        const winner = await read(pathname);
        if (winner) return replay(winner, requestHash);
        throw new BackendError("Deine Bestellung konnte nicht im privaten Blob-Speicher gespeichert werden. Bitte versuche es erneut.");
      }
      return orderReceipt(order);
    },

    async list(page = 0) {
      const paths = new Set();
      const cursors = new Set();
      let cursor;
      try {
        do {
          const batch = await list({ token, prefix: ORDER_BLOB_PREFIX, limit: 1000,
            ...(cursor ? { cursor } : {}), abortSignal: AbortSignal.timeout(15000) });
          for (const blob of batch.blobs) if (orderPath.test(blob.pathname)) paths.add(blob.pathname);
          if (!batch.hasMore) break;
          if (!batch.cursor || cursors.has(batch.cursor)) throw new Error("Invalid cursor");
          cursor = batch.cursor;
          cursors.add(cursor);
        } while (true);
      } catch {
        throw new BackendError("Die Bestellübersicht konnte nicht aus dem privaten Blob-Speicher geladen werden. Bitte versuche es erneut.");
      }
      const orders = [];
      const names = [...paths];
      // Bound concurrent downloads; all SDK list pages must be read before date sorting.
      for (let start = 0; start < names.length; start += 10) {
        const batch = await Promise.all(names.slice(start, start + 10).map(read));
        if (batch.some((order) => !order)) throw new BackendError("Eine Bestellung ist vorübergehend nicht lesbar. Bitte aktualisiere die Übersicht erneut.");
        orders.push(...batch);
      }
      orders.sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
      return { orders: orders.slice(page * 25, page * 25 + 25).map(publicOrder), page, hasMore: orders.length > page * 25 + 25 };
    },
  };
}
