import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createOrderBlobStore, ORDER_BLOB_PREFIX } from "../app/lib/order-blob.js";

const token = "fixture-server-only-token";
const input = (patch = {}) => ({ location: "Frankfurt", idempotencyKey: randomUUID(), date: "2026-10-27", time: "18:30", entries: [{ id: "pub" }, { id: "restaurant", variantId: "greek" }], ...patch });
function fixture(pageSize = 1000) {
  const files = new Map();
  const calls = [];
  const api = {
    async get(path, options) {
      calls.push({ method: "get", path, options });
      await Promise.resolve();
      if (!files.has(path)) return null;
      return { statusCode: 200, stream: new Response(files.get(path)).body };
    },
    async put(path, body, options) {
      calls.push({ method: "put", path, options });
      await Promise.resolve();
      if (files.has(path)) throw new Error("Blob already exists");
      files.set(path, body);
      return { pathname: path, url: `https://fixture.private.blob.vercel-storage.com/${path}` };
    },
    async list(options) {
      calls.push({ method: "list", options });
      const names = [...files.keys()].filter((name) => name.startsWith(options.prefix)).sort();
      const start = Number(options.cursor || 0);
      const end = start + pageSize;
      return { blobs: names.slice(start, end).map((pathname) => ({ pathname })), hasMore: end < names.length, cursor: String(end) };
    },
  };
  return { api, files, calls, store: () => createOrderBlobStore(api, token) };
}

test("Blob configuration is required; an empty store lists no orders and writes nothing", async () => {
  const f = fixture();
  assert.throws(() => createOrderBlobStore(f.api, ""));
  assert.deepEqual(await f.store().list(), { orders: [], page: 0, hasMore: false });
  assert.equal(f.files.size, 0);
});

test("admin order listing preserves the names and prices of the new extras", async () => {
  const f = fixture();
  await f.store().create(input({entries:[{id:"fidget-spinner"},{id:"jojo"}]}));
  const {orders} = await f.store().list();
  assert.deepEqual(orders[0].items,[
    {id:"fidget-spinner",name:"Fidget Spinner",credits:5},
    {id:"jojo",name:"Jojo",credits:5},
  ]);
  assert.equal(orders[0].remaining,90);
});

test("one private JSON blob stores catalog prices and restaurant choice, with deterministic name and no overwriting", async () => {
  const f = fixture(); const order = input();
  const receipt = await f.store().create(order);
  assert.equal(receipt.spent, 50); assert.equal(receipt.remaining, 50);
  const path = `${ORDER_BLOB_PREFIX}${order.idempotencyKey}.json`;
  const saved = JSON.parse(f.files.get(path));
  assert.equal(saved.items[0].name, "Kneipe"); assert.equal(saved.items[0].credits, 15);
  assert.equal(saved.items[1].name, "Restaurant – Grieche");
  assert.equal(receipt.id, saved.id); assert.equal(saved.status, "completed");
  for (const call of f.calls) {
    assert.equal(call.options.token, token);
    if (call.method !== "list") assert.equal(call.options.access, "private");
    if (call.method === "get") assert.equal(call.options.useCache, false);
    if (call.method === "put") {
      assert.equal(call.options.allowOverwrite, false); assert.equal(call.options.addRandomSuffix, false);
      assert.equal(call.options.contentType, "application/json");
    }
  }
  assert.equal(JSON.stringify(receipt).includes(token), false);
});

test("independent server instances and simultaneous retries save exactly one blob and return its winning ID", async () => {
  const f = fixture(); const order = input();
  const results = await Promise.all(Array.from({ length: 25 }, (_, i) => f.store().create({ ...order, entries: i % 2 ? [...order.entries].reverse() : order.entries })));
  assert.equal(new Set(results.map((value) => value.id)).size, 1);
  assert.equal(f.files.size, 1);
  const again = await f.store().create({ ...order, idempotencyKey: order.idempotencyKey.toUpperCase() });
  assert.equal(again.id, results[0].id);
});

test("different concurrent orders use different blobs without lost updates", async () => {
  const f = fixture();
  await Promise.all(Array.from({ length: 12 }, () => f.store().create(input())));
  assert.equal(f.files.size, 12); assert.equal((await f.store().list()).orders.length, 12);
});

test("changed date or selection under an existing key returns conflict without changing the blob", async () => {
  const f = fixture(); const order = input(); await f.store().create(order);
  const original = [...f.files.values()][0];
  await assert.rejects(f.store().create({ ...order, time: "19:00" }), (error) => error.status === 409);
  await assert.rejects(f.store().create({ ...order, entries: [{ id: "bar" }] }), (error) => error.status === 409);
  assert.equal([...f.files.values()][0], original);
});

test("a lost put response is recovered by a consistent read, not a second order", async () => {
  const f = fixture(); const original = f.api.put;
  f.api.put = async (...args) => { await original(...args); throw new Error("Response lost"); };
  const receipt = await f.store().create(input());
  assert.equal(receipt.status, "completed"); assert.equal(f.files.size, 1);
  assert.equal(receipt.id, JSON.parse([...f.files.values()][0]).id);
});

test("failed uploads never confirm success, and retrying the same key works after recovery", async () => {
  const f = fixture(); const original = f.api.put; const order = input();
  f.api.put = async () => { throw new Error("Storage unavailable"); };
  await assert.rejects(f.store().create(order), /nicht.*gespeichert/);
  assert.equal(f.files.size, 0);
  f.api.put = original;
  assert.equal((await f.store().create(order)).status, "completed");
  assert.equal(f.files.size, 1);
});

test("validation rejects invalid prices, removed products and more than 100 credits before SDK access", async () => {
  const f = fixture();
  for (const entries of [[{ id: "gym" }], [{ id: "bar", credits: 0 }], [{ id: "henna-tattoo" }, { id: "arcade" }, { id: "bowling" }, { id: "bar" }, { id: "walking-beer" }]]) {
    await assert.rejects(f.store().create(input({ entries })));
  }
  assert.equal(f.calls.length, 0);
});

test("all Blob list pages are loaded before sorting and paginating dashboard orders", async () => {
  const f = fixture(7);
  for (let i = 0; i < 30; i++) {
    const order = input(); await f.store().create(order);
    const path = `${ORDER_BLOB_PREFIX}${order.idempotencyKey}.json`;
    const saved = JSON.parse(f.files.get(path));
    saved.created_at = new Date(Date.UTC(2026, 9, 18, 12, i)).toISOString();
    f.files.set(path, JSON.stringify(saved));
  }
  f.files.set(`${ORDER_BLOB_PREFIX}readme.json`, "not an order");
  const first = await f.store().list(); const second = await f.store().list(1);
  assert.equal(first.orders.length, 25); assert.equal(first.hasMore, true);
  assert.equal(second.orders.length, 5); assert.equal(second.hasMore, false);
  assert.equal(first.orders[0].created_at, "2026-10-18T12:29:00.000Z");
  assert.equal(second.orders.at(-1).created_at, "2026-10-18T12:00:00.000Z");
  const serialized = JSON.stringify(first);
  for (const internal of [token, "idempotencyKey", "requestHash", ORDER_BLOB_PREFIX, "blob.vercel-storage.com"]) assert.equal(serialized.includes(internal), false);
});

test("read, list, corrupted content and broken cursor errors cannot masquerade as empty/successful orders", async () => {
  const f = fixture(); const order = input(); await f.store().create(order);
  const path = `${ORDER_BLOB_PREFIX}${order.idempotencyKey}.json`;
  f.files.set(path, "{broken");
  await assert.rejects(f.store().list()); await assert.rejects(f.store().create(order));
  const g = fixture(); g.api.list = async () => { throw new Error("denied"); };
  await assert.rejects(g.store().list());
  const h = fixture(); h.api.get = async () => { throw new Error("denied"); };
  await assert.rejects(h.store().create(input())); assert.equal(h.files.size, 0);
  const j = fixture(); j.api.list = async () => ({ blobs: [], hasMore: true, cursor: "same" });
  await assert.rejects(j.store().list());
});

test("location persists into receipts and admin listing and changes retry identity", async () => {
  const f = fixture();
  const order = input({location:"Mainz"});
  assert.equal((await f.store().create(order)).location,"Mainz");
  assert.equal((await f.store().list()).orders[0].location,"Mainz");
  await assert.rejects(f.store().create({...order,location:"Frankfurt"}), /anderen Auswahl/);
});
test("historical records without location remain readable", async () => {
  const f = fixture();
  const order = input();
  await f.store().create(order);
  const path = `${ORDER_BLOB_PREFIX}${order.idempotencyKey}.json`;
  const saved = JSON.parse(f.files.get(path));
  delete saved.location;
  f.files.set(path,JSON.stringify(saved));
  const listed = (await f.store().list()).orders;
  assert.equal(listed.length,1);
  assert.equal(listed[0].location,undefined);
  assert.equal(listed[0].items.length,2);
});
