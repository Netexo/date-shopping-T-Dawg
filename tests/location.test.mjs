import test from "node:test";
import assert from "node:assert/strict";
import { loadLocation, saveLocation, LOCATION_STORAGE_KEY } from "../app/lib/location.js";
import { validateOrder } from "../app/lib/order-validation.js";
import { checkoutDraft } from "../app/checkout/lib/order.js";

const base = { idempotencyKey: "2d2087ae-5bfd-4abc-8431-51ea7e8bb0be", date: "2026-10-27", time: "18:30", entries: [{id:"walk"}] };
test("location survives reload, can be replaced, and ignores invalid stored values", () => {
  const data = new Map();
  const storage = { getItem: key => data.get(key), setItem: (key,value) => data.set(key,value) };
  assert.equal(loadLocation(storage), "");
  saveLocation(storage,"Frankfurt");
  assert.equal(loadLocation(storage),"Frankfurt");
  saveLocation(storage,"Mainz");
  assert.equal(loadLocation(storage),"Mainz");
  assert.throws(() => saveLocation(storage,"Berlin"));
  data.set(LOCATION_STORAGE_KEY,"Berlin");
  assert.equal(loadLocation(storage),"");
});
test("new orders require one of the two exact cities", () => {
  for (const location of [undefined,null,"","Berlin","mainz",{},["Mainz"]]) {
    assert.throws(() => validateOrder({...base,location}));
    assert.equal(checkoutDraft(base,base.entries,location),null);
  }
  for (const location of ["Frankfurt","Mainz"]) assert.equal(validateOrder({...base,location}).location,location);
});
test("changing only location creates a distinct checkout identity", () => {
  const frankfurt = checkoutDraft(base,base.entries,"Frankfurt");
  const mainz = checkoutDraft(base,base.entries,"Mainz");
  assert.notEqual(frankfurt.signature,mainz.signature);
  assert.equal(mainz.location,"Mainz");
});
