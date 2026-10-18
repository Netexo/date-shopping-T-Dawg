// Inclusive local calendar dates; ISO strings compare without timezone conversion.
export const AVAILABLE_RANGES = [
  { start: "2026-10-27", end: "2026-11-01" },
  { start: "2026-11-04", end: "2026-11-08" },
  { start: "2026-11-17", end: "2026-11-22" },
];

export function isAvailableDate(date) {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [year, month, day] = date.split("-").map(Number);
  const days = [31, year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > days[month - 1]) return false;
  return AVAILABLE_RANGES.some(({ start, end }) => date >= start && date <= end);
}
