import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createFriendbookBlobStore, FRIENDBOOK_BLOB_PREFIX } from "../app/lib/friendbook-blob.js";
import { emptyEntry } from "../app/friendbook/lib/storage.js";
import { validateEntry } from "../app/friendbook/lib/validation.js";
import { submitEntry } from "../app/friendbook/lib/submission.js";
const token = "fixture-private-token";
const input = (patch = {}) => ({...emptyEntry(),profile:{...emptyEntry().profile,name:"Testperson",age:"23"},location:"Mainz",date:"2026-10-27",time:"18:30",idempotencyKey:randomUUID(),...patch});
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
  return { api, files, calls, store: () => createFriendbookBlobStore(api, token) };
}

test("private SDK storage uses the existing injected token and isolated prefix", async () => {
  const f = fixture();
  const data = input();
  data.answers["question-1"] = "Meine eigene Antwort\nZweite Zeile";
  const receipt = await f.store().create(data);
  const path = `${FRIENDBOOK_BLOB_PREFIX}${data.idempotencyKey}.json`;
  const saved = JSON.parse(f.files.get(path));
  assert.equal(receipt.status,"completed");
  assert.equal(saved.id,receipt.id);
  assert.equal(saved.answers["question-1"],data.answers["question-1"]);
  assert.equal(saved.questionTitles["question-1"],"Was ist dein bestes Party-Outfit?");
  assert.equal(saved.location,"Mainz");
  assert.equal(saved.date,data.date);
  assert.equal(saved.time,data.time);
  assert.ok(Number.isFinite(Date.parse(saved.created_at)));
  assert.equal(JSON.stringify(receipt).includes(token),false);
  for (const call of f.calls) {
    assert.equal(call.options.token,token);
    if (call.method !== "list") assert.equal(call.options.access,"private");
    if (call.method === "put") {
      assert.equal(call.options.allowOverwrite,false);
      assert.equal(call.options.addRandomSuffix,false);
      assert.ok(call.path.startsWith("friendbook/"));
    }
  }
});
test("concurrent retries and reloads produce one entry, changed payload conflicts", async () => {
  const f = fixture(); const data = input();
  const receipts = await Promise.all(Array.from({length:10},() => f.store().create(data)));
  assert.equal(new Set(receipts.map(receipt => receipt.id)).size,1);
  assert.equal(f.files.size,1);
  assert.equal((await f.store().create(data)).id,receipts[0].id);
  await assert.rejects(f.store().create({...data,location:"Frankfurt"}),error => error.status === 409);
});
test("failed writes never confirm; a lost successful response is recovered", async () => {
  const f = fixture(); const data = input(); const put = f.api.put;
  f.api.put = async () => {throw new Error("offline");};
  await assert.rejects(f.store().create(data));
  assert.equal(f.files.size,0);
  f.api.put = async (...args) => {await put(...args);throw new Error("lost response");};
  assert.equal((await f.store().create(data)).status,"completed");
  assert.equal(f.files.size,1);
});
test("admin list reads all pages, newest first, without touching order files", async () => {
  const f = fixture(1);
  f.files.set("date-shopping/orders/v1/existing.json","existing order");
  for (let index=0;index<3;index++) {
    const data = input();
    await f.store().create(data);
    const path = `${FRIENDBOOK_BLOB_PREFIX}${data.idempotencyKey}.json`;
    const saved = JSON.parse(f.files.get(path));
    saved.created_at = `2026-10-${20+index}T12:00:00Z`;
    f.files.set(path,JSON.stringify(saved));
  }
  const listed = await f.store().list();
  assert.equal(listed.entries.length,3);
  assert.equal(listed.entries[0].created_at,"2026-10-22T12:00:00Z");
  assert.equal(f.files.get("date-shopping/orders/v1/existing.json"),"existing order");
  assert.ok(f.calls.filter(call => call.method === "list").length >= 3);
});
test("validation limits fields and lengths; appointment is optional but must be valid if supplied", () => {
  assert.equal(validateEntry(input({date:undefined,time:undefined})).date,undefined);
  for (const patch of [{location:"Berlin"},{profile:{}},{answers:{}},{idempotencyKey:"bad"},{date:"2026-02-30"},{time:undefined},{extra:"bad"}]) assert.throws(() => validateEntry(input(patch)));
  const data = input();
  data.answers["question-1"] = "a".repeat(10001);
  assert.throws(() => validateEntry(data));
  assert.throws(() => createFriendbookBlobStore(fixture().api,""));
});
test("client retries reuse the persisted key and only acknowledge server success", async () => {
  const values = new Map();
  const storage = {getItem:key => values.get(key) || null,setItem:(key,value) => values.set(key,value)};
  const {idempotencyKey: _key,...payload} = input();
  const f = fixture(); const keys = [];
  await assert.rejects(submitEntry(storage,payload,async (_,options) => {
    keys.push(JSON.parse(options.body).idempotencyKey);
    throw new Error("offline");
  }));
  const receipt = await submitEntry(storage,payload,async (_,options) => {
    const body = JSON.parse(options.body); keys.push(body.idempotencyKey);
    return Response.json({receipt:await f.store().create(body)});
  });
  assert.equal(keys[0],keys[1]);
  assert.equal(receipt.status,"completed");
  assert.equal((await submitEntry(storage,payload,() => {throw new Error("must not resend");})).id,receipt.id);
});

test("linked checkout persists one order, server prices, and complete admin details", async () => {
  const {createOrderBlobStore} = await import("../app/lib/order-blob.js");
  const {entryOverview} = await import("../app/lib/entry-overview.js");
  const {loadEntryReference} = await import("../app/friendbook/lib/submission.js");
  const {checkoutDraft,completeOrder} = await import("../app/checkout/lib/order.js");
  const f = fixture(); const friendbooks = f.store();
  const orders = createOrderBlobStore(f.api,token,friendbooks);
  const data = input(); const {idempotencyKey:_key,...payload} = data;
  const values = new Map();
  const storage = {getItem:key => values.get(key) || null,setItem:(key,value) => values.set(key,value)};
  const receipt = await submitEntry(storage,payload,async (_,options) => Response.json({receipt:await friendbooks.create(JSON.parse(options.body))}));
  const reference = loadEntryReference(storage);
  assert.deepEqual(reference,{id:receipt.id,key:receipt.key});
  const pending = await entryOverview(friendbooks,orders);
  assert.equal(pending.entries[0].progress,"Freundesbuch abgeschlossen");
  const draft = checkoutDraft(data,[{id:"henna-tattoo"},{id:"restaurant",variantId:"asian"},{id:"jojo"}],data.location,reference);
  const send = async (_,options) => Response.json({receipt:await orders.create(JSON.parse(options.body))});
  await Promise.all([completeOrder(storage,draft,send),completeOrder(storage,draft,send)]);
  const overview = await entryOverview(friendbooks,orders);
  const entry = overview.entries[0];
  assert.equal(entry.progress,"Bestellung abgeschlossen");
  assert.equal(entry.orders.length,1);
  assert.equal(entry.orders[0].friendbookId,receipt.id);
  assert.equal(entry.orders[0].spent,60);
  assert.equal(entry.orders[0].remaining,40);
  assert.deepEqual(entry.orders[0].items.map(item => item.category),["activities","food-drinks","extras"]);
  assert.equal(entry.orders[0].items[1].name,"Restaurant – Asiate");
  assert.equal(f.files.size,2);
});
test("checkout rejects missing, forged and mismatched friendbook references before writing", async () => {
  const {createOrderBlobStore} = await import("../app/lib/order-blob.js");
  const f = fixture(); const friendbooks = f.store();
  const orders = createOrderBlobStore(f.api,token,friendbooks);
  const data = input(); const entry = await friendbooks.create(data);
  const order = {idempotencyKey:randomUUID(),date:data.date,time:data.time,location:data.location,entries:[{id:"walk"}]};
  const reference = {id:entry.id,key:entry.key};
  for (const patch of [{},{friendbook:{...reference,id:randomUUID()}},{friendbook:{...reference,key:randomUUID()}},{friendbook:reference,location:"Frankfurt"},{friendbook:reference,time:"19:00"},{friendbook:reference,entries:[{id:"walk",credits:0}]}]) {
    await assert.rejects(orders.create({...order,...patch}));
  }
  assert.equal(f.files.size,1);
});

test("new server instances can reload and join persisted friendbooks and orders", async () => {
  const {createOrderBlobStore} = await import("../app/lib/order-blob.js");
  const {entryOverview} = await import("../app/lib/entry-overview.js");
  const f = fixture();
  const payload = input();
  const firstFriendbooks = f.store();
  const receipt = await firstFriendbooks.create(payload);
  const firstOrders = createOrderBlobStore(f.api,token,firstFriendbooks);
  const orderInput = {
    idempotencyKey:randomUUID(),location:payload.location,date:payload.date,time:payload.time,
    friendbook:{id:receipt.id,key:receipt.key},entries:[{id:"restaurant",variantId:"greek"},{id:"jojo"}],
  };
  const orderReceipt = await firstOrders.create(orderInput);
  const restartedFriendbooks = createFriendbookBlobStore(f.api,token);
  const restartedOrders = createOrderBlobStore(f.api,token,restartedFriendbooks);
  const overview = await entryOverview(restartedFriendbooks,restartedOrders);
  assert.equal(overview.entries[0].id,receipt.id);
  assert.equal(overview.entries[0].orders[0].id,orderReceipt.id);
  assert.equal(overview.entries[0].orders[0].spent,40);
  assert.equal(overview.entries[0].progress,"Bestellung abgeschlossen");
  assert.equal((await restartedOrders.create(orderInput)).id,orderReceipt.id);
  assert.equal(f.files.size,2);
});
test("a cached success still reports an understandable error if its browser reference cannot be saved", async () => {
  const {ENTRY_REFERENCE_KEY} = await import("../app/friendbook/lib/submission.js");
  const values = new Map();
  const storage = {getItem:key => values.get(key) || null,setItem:(key,value) => values.set(key,value)};
  const {idempotencyKey:_key,...payload} = input();
  const f = fixture();
  await submitEntry(storage,payload,async (_,options) => Response.json({receipt:await f.store().create(JSON.parse(options.body))}));
  storage.setItem = (key,value) => {
    if (key === ENTRY_REFERENCE_KEY) throw new Error("QuotaExceededError");
    values.set(key,value);
  };
  await assert.rejects(submitEntry(storage,payload,() => {throw new Error("must not send again");}),/Eintrag ist gespeichert.*Zuordnung.*Browserspeicher/);
  assert.equal(f.files.size,1);
});

test("missing storage configuration names the required server variable without making SDK calls", async () => {
  const {createOrderBlobStore} = await import("../app/lib/order-blob.js");
  const f = fixture();
  for (const missing of [undefined,null,"","   "]) {
    for (const factory of [createFriendbookBlobStore,createOrderBlobStore]) {
      assert.throws(() => factory(f.api,missing),error => error.status === 503 && error.message.includes("BLOB_READ_WRITE_TOKEN"));
    }
  }
  assert.equal(f.calls.length,0);
});
