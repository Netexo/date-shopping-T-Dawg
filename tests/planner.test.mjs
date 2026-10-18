import test from "node:test";
import assert from "node:assert/strict";
import { initialSelection, plannerReducer, monthCells, formatDate, dateKey } from "../app/calendar/lib/planner.js";
import { isAvailableDate } from "../app/lib/availability.js";
import { readAppointment, parseAppointment } from "../app/shop/lib/appointment.js";
import { validateOrder } from "../app/lib/order-validation.js";
import { checkoutDraft } from "../app/checkout/lib/order.js";

test("Monday-first grids and bounded navigation start in October", () => {
  assert.equal(initialSelection.month, 9);
  for (const [month, count, offset] of [[9,31,3],[10,30,6]]) {
    const cells = monthCells(month);
    assert.equal(cells.length % 7, 0);
    assert.equal(cells.filter(c => c.currentMonth).length, count);
    assert.equal(cells.findIndex(c => c.currentMonth && c.day === 1), offset);
  }
  const november = plannerReducer(initialSelection, { type: "month", month: 10 });
  assert.equal(november.month, 10);
  assert.equal(plannerReducer(november, { type: "month", month: 11 }), november);
  assert.equal(plannerReducer(november, { type: "month", month: 9 }).month, 9);
});

test("every October and November date is validated through selection, shop, checkout and server", () => {
  for (const month of [9,10]) for (const {day,currentMonth} of monthCells(month)) {
    if (!currentMonth) continue;
    const date = dateKey(day, month);
    const available = month === 9 ? day >= 27 : day === 1 || (day >= 4 && day <= 8) || (day >= 17 && day <= 22);
    assert.equal(isAvailableDate(date), available, date);
    let state = plannerReducer(initialSelection, { type: "select", date });
    const late = month === 10 && day >= 17 && day <= 22;
    assert.equal(state.phase, available ? late ? "prompt" : "time" : "calendar", date);
    if (late) for (let i = 0; i < 3; i++) state = plannerReducer(state, { type: "keep" });
    assert.equal(!!readAppointment(date, "18:30"), available);
    assert.equal(!!checkoutDraft({date,time:"18:30",location:"Frankfurt"}, [{id:"walk"}]), available);
    const input = {location:"Frankfurt",date,time:"18:30",entries:[{id:"walk"}],idempotencyKey:"fbcce3d8-d84e-43b3-8f48-34a98906144d"};
    if (available) {
      assert.equal(validateOrder(input).date,date);
      const confirmed = plannerReducer(state, {type:"confirm",time:"18:30"});
      assert.equal(confirmed.date,date);
      assert.equal(confirmed.phase,"confirmed");
    } else assert.throws(() => validateOrder(input));
  }
});

test("invalid dates and times fail; historical appointments remain readable", () => {
  for (const date of ["2026-11-31","2026-10-00","2026-12-01","2027-10-27",null,42,"2026-11-01T00:00:00Z"]) assert.equal(isAvailableDate(date),false);
  assert.equal(parseAppointment("2026-10-01","18:30").label,"01.10.2026 · 18:30 Uhr");
  assert.equal(formatDate("2026-11-01"),"Sonntag, 1. November 2026");
  const state = plannerReducer(initialSelection,{type:"select",date:"2026-11-08"});
  for (const time of ["", "24:00", "12:60", "9:00"]) assert.equal(plannerReducer(state,{type:"confirm",time}),state);
  for (const time of ["00:00","23:59"]) assert.equal(plannerReducer(state,{type:"confirm",time}).phase,"confirmed");
  const tampered = {...state,date:"2026-11-23"};
  assert.equal(plannerReducer(tampered,{type:"confirm",time:"18:30"}),tampered);
});

test("historical order records remain valid outside current availability", async () => {
  const { validOrderRecord } = await import("../app/lib/order-record.js");
  assert.equal(validOrderRecord({
    id: "historical-order", idempotencyKey: "historical-key", requestHash: "historical-hash",
    status: "completed", date: "2026-10-01", time: "18:30", created_at: "2026-10-01T12:00:00Z",
    spent: 10, remaining: 90, items: [{ id: "historical-product", name: "Saved product", credits: 10 }],
  }), true);
});


test("all late dates require exactly three confirmations and remain selectable", () => {
  for (let day = 17; day <= 22; day++) {
    const date = dateKey(day,10);
    let state = plannerReducer({...initialSelection,month:10},{type:"select",date});
    for (let step = 0; step < 3; step++) {
      assert.equal(state.phase,"prompt");
      assert.equal(state.promptIndex,step);
      assert.equal(state.pendingDate,date);
      assert.equal(state.date,null);
      assert.equal(plannerReducer(state,{type:"confirm",time:"18:30"}),state);
      state = plannerReducer(state,{type:"keep"});
    }
    assert.equal(state.phase,"time");
    assert.equal(state.date,date);
    assert.equal(state.pendingDate,null);
    assert.equal(plannerReducer(state,{type:"keep"}),state);
    assert.equal(plannerReducer(state,{type:"confirm",time:"18:30"}).phase,"confirmed");
  }
});

test("choosing earlier at any prompt resets the sequence and preserves month navigation", () => {
  for (let step = 0; step < 3; step++) {
    let state = plannerReducer({...initialSelection,month:10},{type:"select",date:"2026-11-17"});
    for (let i = 0; i < step; i++) state = plannerReducer(state,{type:"keep"});
    state = plannerReducer(state,{type:"earlier"});
    assert.deepEqual(state,{...initialSelection,month:10});
    assert.equal(plannerReducer(state,{type:"select",date:"2026-11-08"}).phase,"time");
    const october = plannerReducer(state,{type:"month",month:9});
    assert.equal(october.month,9);
    assert.equal(plannerReducer(october,{type:"select",date:"2026-10-27"}).phase,"time");
    assert.equal(plannerReducer(state,{type:"select",date:"2026-11-22"}).promptIndex,0);
  }
});
