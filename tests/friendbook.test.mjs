import test from "node:test";
import assert from "node:assert/strict";
import { ENTRY_STORAGE_KEY, emptyEntry, loadEntry, saveEntry } from "../app/friendbook/lib/storage.js";
import { myProfile, questions } from "../app/friendbook/lib/content.js";

function memoryStorage() {
  const values = new Map([["date-shopping.checkout.v4", "existing orders"]]);
  return { getItem: key => values.get(key) ?? null, setItem: (key,value) => values.set(key,value) };
}
test("drafts and completed entries survive reload without touching orders or own profile", () => {
  const storage = memoryStorage();
  const original = JSON.stringify(myProfile);
  const entry = emptyEntry();
  entry.profile.name = "Testperson";
  entry.answers[questions[0].id] = "Eine längere Antwort.\nMit einer zweiten Zeile.";
  const appointment = { date: "2026-11-22", time: "23:59" };
  saveEntry(storage,entry,appointment);
  assert.deepEqual(loadEntry(storage),{...entry,completed:false});
  saveEntry(storage,entry,appointment,true);
  assert.deepEqual(loadEntry(storage),{...entry,completed:true});
  assert.deepEqual(JSON.parse(storage.getItem(ENTRY_STORAGE_KEY)).appointment,appointment);
  assert.equal(storage.getItem("date-shopping.checkout.v4"),"existing orders");
  assert.equal(JSON.stringify(myProfile),original);
});
test("restoring entries only accepts known text fields and reports storage failures", () => {
  const storage = memoryStorage();
  storage.setItem(ENTRY_STORAGE_KEY,JSON.stringify({profile:{name:"Testperson",age:42,unknown:"ignore"},answers:{"question-1":null},completed:"true"}));
  const entry = loadEntry(storage);
  assert.equal(entry.profile.name,"Testperson");
  assert.equal(entry.profile.age,"");
  assert.equal(entry.profile.unknown,undefined);
  assert.equal(entry.answers[questions[0].id],"");
  assert.equal(entry.completed,false);
  assert.throws(() => saveEntry({setItem(){throw new Error("Blocked");}},emptyEntry(),{date:"2026-11-01",time:"18:00"},true));
});
