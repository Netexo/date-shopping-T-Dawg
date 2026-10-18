import { createHash, randomUUID } from "node:crypto";
import { validateEntry, validEntryRecord } from "../friendbook/lib/validation.js";
import { questions } from "../friendbook/lib/content.js";
import { BackendError } from "./backend-error.js";
const entryReceipt = ({id,idempotencyKey,created_at,status}) => ({id,key:idempotencyKey,created_at,status});

export const FRIENDBOOK_BLOB_PREFIX = "friendbook/v1/";
const entryPath = new RegExp(`^${FRIENDBOOK_BLOB_PREFIX}[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\.json$`);

// The SDK and token are injected by a server-only module; neither reaches the client.
export function createFriendbookBlobStore({ put, get, list }, token) {
  if (typeof token !== "string" || !token.trim()) throw new BackendError("Der Freundesbuch-Speicher ist noch nicht eingerichtet: BLOB_READ_WRITE_TOKEN fehlt. Bitte verbinde den vorhandenen privaten Blob Store mit dem Vercel-Projekt und prüfe die Umgebungsvariable.");

  async function read(pathname) {
    try {
      const result = await get(pathname, { access: "private", token, useCache: false, abortSignal: AbortSignal.timeout(15000) });
      if (!result) return null;
      if (result.statusCode !== 200 || !result.stream) throw new Error("Missing content");
      const entry = await new Response(result.stream).json();
      if (!validEntryRecord(entry) || `${FRIENDBOOK_BLOB_PREFIX}${entry.idempotencyKey}.json` !== pathname) throw new Error("Invalid friendbook snapshot");
      return entry;
    } catch {
      throw new BackendError("Die gespeicherten Freundesbuch-Einträge konnten nicht aus dem privaten Blob-Speicher geladen werden. Bitte versuche es erneut.");
    }
  }

  function replay(existing, hash) {
    if (existing.requestHash !== hash) throw new BackendError("Diese Eintragskennung gehört zu einer anderen Auswahl. Bitte prüfe deinen Eintrag.", 409);
    return entryReceipt(existing);
  }

  return {
    async resolve(reference) {
      if (!reference || typeof reference.key !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(reference.key)) throw new BackendError("Bitte schließe zuerst deinen Freundesbuch-Eintrag ab.",400);
      const entry = await read(`${FRIENDBOOK_BLOB_PREFIX}${reference.key.toLowerCase()}.json`);
      if (!entry || entry.id !== reference.id) throw new BackendError("Dein Freundesbuch-Eintrag wurde nicht gefunden. Bitte schließe ihn erneut ab.",400);
      return entry;
    },
    async create(input) {
      const validated = validateEntry(input);
      const {idempotencyKey: _key, ...canonical} = validated;
      const requestHash = createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
      const pathname = `${FRIENDBOOK_BLOB_PREFIX}${validated.idempotencyKey}.json`;
      const existing = await read(pathname);
      if (existing) return replay(existing, requestHash);
      const entry = { ...validated, questionTitles: Object.fromEntries(questions.map(({id,title}) => [id,title])), id: randomUUID(), requestHash, created_at: new Date().toISOString(), status: "completed" };
      try {
        await put(pathname, JSON.stringify(entry, null, 2), {
          access: "private", token, contentType: "application/json", addRandomSuffix: false,
          allowOverwrite: false, abortSignal: AbortSignal.timeout(15000),
        });
      } catch {
        // Another instance may have won, or storage succeeded but its response was lost.
        // A consistent read returns the winning receipt; never overwrite it.
        const winner = await read(pathname);
        if (winner) return replay(winner, requestHash);
        throw new BackendError("Dein Eintrag konnte nicht im privaten Blob-Speicher gespeichert werden. Bitte versuche es erneut.");
      }
      return entryReceipt(entry);
    },

    async list(page = 0) {
      const paths = new Set();
      const cursors = new Set();
      let cursor;
      try {
        do {
          const batch = await list({ token, prefix: FRIENDBOOK_BLOB_PREFIX, limit: 1000,
            ...(cursor ? { cursor } : {}), abortSignal: AbortSignal.timeout(15000) });
          for (const blob of batch.blobs) if (entryPath.test(blob.pathname)) paths.add(blob.pathname);
          if (!batch.hasMore) break;
          if (!batch.cursor || cursors.has(batch.cursor)) throw new Error("Invalid cursor");
          cursor = batch.cursor;
          cursors.add(cursor);
        } while (true);
      } catch {
        throw new BackendError("Die Freundesbuch-Übersicht konnte nicht aus dem privaten Blob-Speicher geladen werden. Bitte versuche es erneut.");
      }
      const entries = [];
      const names = [...paths];
      // Bound concurrent downloads; all SDK list pages must be read before date sorting.
      for (let start = 0; start < names.length; start += 10) {
        const batch = await Promise.all(names.slice(start, start + 10).map(read));
        if (batch.some((entry) => !entry)) throw new BackendError("Ein Eintrag ist vorübergehend nicht lesbar. Bitte aktualisiere die Übersicht erneut.");
        entries.push(...batch);
      }
      entries.sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
      return { entries: entries.slice(page * 25, page * 25 + 25), page, hasMore: entries.length > page * 25 + 25 };
    },
  };
}
