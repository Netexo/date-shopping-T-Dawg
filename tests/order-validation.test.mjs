import test from "node:test";
import assert from "node:assert/strict";
import { validateOrder } from "../app/lib/order-validation.js";
const key="2d2087ae-5bfd-4abc-8431-51ea7e8bb0be";
const input=(entries)=>({location:"Frankfurt",idempotencyKey:key,date:"2026-10-27",time:"18:30",entries});

test("server computes prices, product names, restaurant selection and remaining credits",()=>{
  const order=validateOrder(input([{id:"henna-tattoo"},{id:"restaurant",variantId:"greek"}]));
  assert.equal(order.spent,55);assert.equal(order.remaining,45);
  assert.equal(order.items[1].name,"Restaurant – Grieche");
});

test("server rejects forged prices, duplicate products, removed products and invalid restaurant variants",()=>{
  for(const entries of [[],[{id:"henna-tattoo",credits:0}],[{id:"bar"},{id:"bar"}],[{id:"gym"}],[{id:"restaurant"}],[{id:"restaurant",variantId:"unknown"}],[{id:"dinner-date"}],[{id:"__proto__"}],[{id:{toString:null}}],[{id:"bar",variantId:"asian"}]]) assert.throws(()=>validateOrder(input(entries)));
  assert.throws(()=>validateOrder({...input([{id:"walk"}]),spent:0}));
});

test("server accepts exactly 100 credits and rejects any over-budget selection instead of silently dropping products",()=>{
  const entries=[{id:"henna-tattoo"},{id:"arcade"},{id:"bowling"},{id:"bar"},{id:"cards"}];
  assert.equal(validateOrder(input(entries)).remaining,0);
  assert.throws(()=>validateOrder(input([...entries,{id:"walk"}])));
});

test("server rejects invalid dates, times, malformed bodies and non-UUID retry keys",()=>{
  for(const patch of [{date:"2026-02-30"},{date:"0000-01-01"},{time:"24:00"},{time:"8:00"},{idempotencyKey:"known-order"},{entries:null}]) assert.throws(()=>validateOrder({...input([{id:"walk"}]),...patch}));
  for(const body of [null,[],"invalid"])assert.throws(()=>validateOrder(body));
});

test("server rejects removed pickup service and Gym",()=>{
  assert.throws(()=>validateOrder(input([{id:"pickup-service"}])));
  assert.throws(()=>validateOrder(input([{id:"gym"}])));
});

test("server accepts Henna Tattoo at 20 credits and rejects removed badminton", () => {
  assert.deepEqual(validateOrder(input([{id:"henna-tattoo"}])).items,[{id:"henna-tattoo",name:"Henna Tattoo",credits:20}]);
  assert.throws(() => validateOrder(input([{id:"badminton"}])));
});

test("server prices the new extras and rejects removed Megafon", () => {
  const order = validateOrder(input([{id:"fidget-spinner"},{id:"jojo"}]));
  assert.deepEqual(order.items,[
    {id:"fidget-spinner",name:"Fidget Spinner",credits:5},
    {id:"jojo",name:"Jojo",credits:5},
  ]);
  assert.equal(order.remaining,90);
  assert.throws(() => validateOrder(input([{id:"megaphone"}])));
});
