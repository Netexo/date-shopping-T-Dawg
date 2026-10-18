import { parseAppointment } from "../shop/lib/appointment.js";

import { validLocation } from "./location.js";

export function validOrderRecord(order) {
  if (!order || typeof order.id !== "string" || typeof order.idempotencyKey !== "string"
    || typeof order.requestHash !== "string" || order.status !== "completed"
    || (order.location !== undefined && !validLocation(order.location))
    || !parseAppointment(order.date, order.time) || !Number.isFinite(Date.parse(order.created_at))
    || !Number.isInteger(order.spent) || order.spent < 1 || order.spent > 100 || order.remaining !== 100 - order.spent
    || !Array.isArray(order.items) || !order.items.length) return false;
  const ids = new Set();
  return order.items.every((item) => {
    if (!item || typeof item.id !== "string" || ids.has(item.id) || typeof item.name !== "string"
      || !Number.isInteger(item.credits) || item.credits < 1) return false;
    ids.add(item.id);
    return true;
  }) && order.items.reduce((total, item) => total + item.credits, 0) === order.spent;
}

export function publicOrder({ id, date, time, items, spent, remaining, created_at, status, location }) {
  return { id, date, time, items, spent, remaining, created_at, status, ...(location ? { location } : {}) };
}

export function orderReceipt({ id, date, time, spent, remaining, created_at, status, location }) {
  return { id, date, time, spent, remaining, created_at, status, ...(location ? { location } : {}) };
}
