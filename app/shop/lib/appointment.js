import { isAvailableDate } from "../../lib/availability.js";

export function readAppointment(date, time) {
  return isAvailableDate(date) ? parseAppointment(date, time) : null;
}

// Historical records remain readable even when availability changes.
export function parseAppointment(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "") || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time || "")) return null;
  const utcDate = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(utcDate.getTime()) || utcDate.toISOString().slice(0, 10) !== date) return null;
  return {
    date,
    time,
    label: `${new Intl.DateTimeFormat("de-DE", {
      day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC",
    }).format(utcDate)} · ${time} Uhr`,
  };
}
