import test from "node:test";
import assert from "node:assert/strict";
import { products, categories } from "../app/shop/lib/products.js";
import { cartReducer, cartSummary, initialCart, restoreCart } from "../app/shop/lib/cart.js";
import { readAppointment } from "../app/shop/lib/appointment.js";

const empty = () => cartReducer(initialCart, { type: "restore", entries: [] });
const add = (state, id, variantId) => cartReducer(state, { type: "add", id, variantId });
const summary = (state) => cartSummary(state.entries);

test("catalog contains only the 16 product cards in the three requested categories", () => {
  assert.deepEqual(products.filter((p) => !p.variants).map(({ name, points }) => [name, points]), [
    ["Henna Tattoo",20], ["Spaziergang",5], ["Bowling",30],
    ["Arcade Halle",25], ["Barsport (Kicker / Billard / Dart)",20], ["Bar",20], ["Kneipe",15],
    ["Kartendeck",5], ["Wegbier",10], ["Trillerpfeife",5], ["Fidget Spinner",5], ["Jojo",5], ["Einhorn",15], ["Mystery Box",25], ["5 Fragen",5],
  ]);
  assert.deepEqual(products.find((p) => p.id === "restaurant").variants.map(({name,points}) => [name,points]), [
    ["Asiate",35], ["Fast Food",20], ["Grieche",35], ["Italiener",35], ["All you can eat",40],
  ]);
  assert.equal(products.length,16);
  assert.equal(products.filter((p) => p.category === "activities").length,5);
  assert.equal(products.filter((p) => p.category === "extras").length,8);
  assert.deepEqual(categories.map((c) => c.id),["all","activities","food-drinks","extras"]);
});

test("each fixed-price product can be added once and removed for a full refund", () => {
  for (const product of products.filter((p) => !p.variants)) {
    const state = add(empty(),product.id);
    assert.equal(summary(state).remaining,100-product.points);
    assert.equal(summary(state).count,1);
    assert.deepEqual(add(state,product.id),state);
    assert.equal(summary(cartReducer(state,{type:"remove",id:product.id})).remaining,100);
  }
});

test("restaurant needs a valid choice, counts once and uses the exact variant price", () => {
  assert.deepEqual(add(empty(),"restaurant"),empty());
  assert.deepEqual(add(empty(),"restaurant","invalid"),empty());
  for (const variant of products.find((p) => p.id === "restaurant").variants) {
    const state=add(empty(),"restaurant",variant.id);
    assert.equal(summary(state).remaining,100-variant.points);
    assert.equal(summary(state).count,1);
    assert.equal(summary(state).items[0].name,`Restaurant – ${variant.name}`);
    assert.deepEqual(add(state,"restaurant",variant.id),state);
    assert.equal(summary(cartReducer(state,{type:"remove",id:"restaurant"})).remaining,100);
  }
});

test("switching variants charges only the difference and refunds cheaper choices", () => {
  let state=add(add(empty(),"bowling"),"restaurant","fast-food");
  assert.equal(summary(state).remaining,50);
  state=add(state,"restaurant","all-you-can-eat");
  assert.equal(summary(state).remaining,30);
  assert.equal(summary(state).count,2);
  state=add(state,"restaurant","asian");
  assert.equal(summary(state).remaining,35);
  state=add(state,"restaurant","fast-food");
  assert.equal(summary(state).remaining,50);
});

test("switching uses the refunded current price and refuses unaffordable variants atomically", () => {
  let state=add(add(add(empty(),"henna-tattoo"),"arcade"),"bowling");
  state=add(state,"restaurant","fast-food");
  assert.equal(summary(state).remaining,5);
  assert.deepEqual(add(state,"restaurant","asian"),state);
  assert.deepEqual(add(state,"walking-beer"),state);
  state=cartReducer(state,{type:"remove",id:"henna-tattoo"});
  state=add(state,"restaurant","all-you-can-eat");
  assert.equal(summary(state).remaining,5);
  assert.equal(summary(state).count,3);
});

test("old carts and malformed values are sanitized using current catalog prices", () => {
  for (const invalid of [null,{},"henna-tattoo",100]) assert.deepEqual(restoreCart(invalid),[]);
  assert.deepEqual(restoreCart(["padel-match","mini-golf","picnic","cocktail-night","coffee-date","dinner-date","uber-ride","personal-driver","flowers","mystery-surprise"]),[]);
  const entries=restoreCart([
    {id:"henna-tattoo",points:1}, {id:"henna-tattoo"}, {id:"restaurant",variantId:"asian",points:0},
    {id:"restaurant",variantId:"fast-food"}, {id:"__proto__"}, {id:"restaurant",variantId:"invalid"},
    {id:"bowling"},{id:"gym"},{id:"walking-beer"},
  ]);
  assert.deepEqual(entries,[{id:"henna-tattoo"},{id:"restaurant",variantId:"asian"},{id:"bowling"},{id:"walking-beer"}]);
  assert.equal(cartSummary(entries).remaining,5);
  const restored=cartReducer(initialCart,{type:"restore",entries:JSON.parse(JSON.stringify(entries))});
  assert.deepEqual(restored.entries,entries);
  assert.equal(restored.ready,true);
});

test("invalid or premature additions do nothing; no cross-product exclusions apply", () => {
  assert.deepEqual(add(initialCart,"cards"),initialCart);
  assert.deepEqual(add(empty(),"__proto__"),empty());
  const state=add(add(add(empty(),"bar"),"walking-beer"),"arcade");
  assert.equal(summary(state).count,3);
  assert.equal(summary(state).remaining,45);
});

test("appointment dates and times are still preserved", () => {
  assert.equal(readAppointment("2026-10-27","00:07").label,"27.10.2026 · 00:07 Uhr");
  assert.equal(readAppointment("2026-02-30","12:00"),null);
});

test("saved Gym and pickup service entries are removed without losing valid items or charging their old price", () => {
  const entries=restoreCart(["gym",{id:"gym"},{id:"pickup-service",points:1},{id:"walk"}]);
  assert.deepEqual(entries,[{id:"walk"}]);
  assert.equal(cartSummary(entries).spent,5);
  assert.equal(cartSummary(entries).remaining,95);
});

test("removed badminton is dropped from saved carts", () => {
  assert.deepEqual(restoreCart([{id:"badminton"},{id:"henna-tattoo"}]),[{id:"henna-tattoo"}]);
});

test("removed megaphone is dropped without losing the new extras", () => {
  const entries = restoreCart([{id:"megaphone"},{id:"fidget-spinner"},{id:"jojo"}]);
  assert.deepEqual(entries,[{id:"fidget-spinner"},{id:"jojo"}]);
  assert.equal(cartSummary(entries).remaining,90);
});
