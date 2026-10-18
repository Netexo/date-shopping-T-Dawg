import test from "node:test";
import assert from "node:assert/strict";
import { checkoutDraft, completeOrder, findCompletedOrder, ORDER_STORAGE_KEY } from "../app/checkout/lib/order.js";

const appointment = { location: "Frankfurt", date: "2026-10-27", time: "18:30" };
const entries = [{ id: "henna-tattoo" }, { id: "restaurant", variantId: "asian" }];

test("checkout shows both new extras at their catalog prices", () => {
  const draft = checkoutDraft(appointment,[{id:"fidget-spinner"},{id:"jojo"}]);
  assert.deepEqual(draft.items,[
    {id:"fidget-spinner",name:"Fidget Spinner",credits:5},
    {id:"jojo",name:"Jojo",credits:5},
  ]);
  assert.equal(draft.spent,10);
  assert.equal(draft.remaining,90);
});
function memoryStorage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) || null, setItem(key, value) { values.set(key, value); } };
}
const receipt = { location: "Frankfurt", id: "fbcce3d8-d84e-43b3-8f48-34a98906144d", status: "completed", date: appointment.date, time: appointment.time, spent: 55, remaining: 45, created_at: "2026-10-18T12:00:00Z" };

test("checkout needs valid appointment and products and uses the selected restaurant price", async () => {
  for (const invalid of [null, {date:appointment.date}, {time:appointment.time}]) assert.equal(checkoutDraft(invalid,entries),null);
  assert.equal(checkoutDraft(appointment,[]),null);
  await assert.rejects(completeOrder(memoryStorage(),null));
  const draft=checkoutDraft(appointment,entries);
  assert.equal(draft.spent,55);
  assert.equal(draft.items[1].name,"Restaurant – Asiate");
});

test("nothing is submitted before completion; only IDs and date/time are sent", async () => {
  const storage=memoryStorage();
  const draft=checkoutDraft(appointment,entries);
  assert.equal(findCompletedOrder(storage,draft),null);
  let payload;
  const order=await completeOrder(storage,draft,async (url,options)=>{
    assert.equal(url,"/api/orders");payload=JSON.parse(options.body);
    return Response.json({receipt});
  });
  assert.deepEqual(payload.entries,entries);
  assert.deepEqual(Object.keys(payload).sort(),["date","entries","idempotencyKey","location","time"]);
  assert.equal(order.backend,"vercel-blob");
  assert.equal(findCompletedOrder(storage,draft).id,receipt.id);
});

test("lost responses retry with the same key, and successful reload/reordered cart reuses the receipt", async () => {
  const storage=memoryStorage();const draft=checkoutDraft(appointment,entries);const keys=[];
  await assert.rejects(completeOrder(storage,draft,async (_,options)=>{keys.push(JSON.parse(options.body).idempotencyKey);throw new Error("lost response");}));
  assert.equal(findCompletedOrder(storage,draft),null);
  await completeOrder(storage,draft,async (_,options)=>{keys.push(JSON.parse(options.body).idempotencyKey);return Response.json({receipt});});
  assert.equal(keys[0],keys[1]);
  const order=await completeOrder(storage,checkoutDraft(appointment,[...entries].reverse()),()=>{throw new Error("must not send again");});
  assert.equal(order.id,receipt.id);
});

test("backend errors and unconfirmed responses never mark the order completed", async () => {
  const storage=memoryStorage();const draft=checkoutDraft(appointment,entries);
  await assert.rejects(completeOrder(storage,draft,async()=>Response.json({error:"Bestelldatei nicht beschreibbar"},{status:503})),/Bestelldatei/);
  assert.equal(findCompletedOrder(storage,draft),null);
  await assert.rejects(completeOrder(storage,draft,async()=>Response.json({receipt:{status:"completed"}})));
  assert.equal(findCompletedOrder(storage,draft),null);
});

test("old local-only orders are not treated as server confirmations or auto-submitted", () => {
  const storage=memoryStorage();const draft=checkoutDraft(appointment,entries);
  storage.setItem("date-shopping.orders.v1",JSON.stringify([{...draft,...receipt}]));
  assert.equal(findCompletedOrder(storage,draft),null);
  assert.equal(storage.getItem(ORDER_STORAGE_KEY),null);
});

test("a blocked retry-key store prevents submission, but failure to cache an acknowledged receipt does not undo success", async () => {
  const draft=checkoutDraft(appointment,entries);let sends=0;
  await assert.rejects(completeOrder({getItem:()=>null,setItem:()=>{throw new Error("blocked");}},draft,()=>{sends++;}));
  assert.equal(sends,0);
  const storage=memoryStorage();const write=storage.setItem.bind(storage);let writes=0;
  storage.setItem=(key,value)=>{if(++writes===2)throw new Error("full");write(key,value);};
  const order=await completeOrder(storage,draft,async()=>Response.json({receipt}));
  assert.equal(order.id,receipt.id);
});

test("removed pickup service cannot enter checkout and is dropped from mixed carts", () => {
  assert.equal(checkoutDraft(appointment,[{id:"pickup-service"}]),null);
  const draft = checkoutDraft(appointment,[{id:"pickup-service"},{id:"walk"}]);
  assert.deepEqual(draft.items,[{id:"walk",name:"Spaziergang",credits:5}]);
  assert.equal(draft.remaining,95);
});
