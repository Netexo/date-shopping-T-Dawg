import { isAvailableDate } from "../../lib/availability.js";

export const YEAR = 2026;
export const MONTH = 9;
export const LAST_MONTH = 10;
export function dateKey(day, month = MONTH) {
  return `${YEAR}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
export function formatDate(date) {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}
export function monthCells(month = MONTH) {
  const offset = (new Date(Date.UTC(YEAR, month, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(YEAR, month + 1, 0)).getUTCDate();
  return Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, index) => {
    const date = new Date(Date.UTC(YEAR, month, index - offset + 1));
    const day = date.getUTCDate();
    return { day, currentMonth: date.getUTCMonth() === month, date: date.toISOString().slice(0, 10) };
  });
}
export const initialSelection = { phase: "calendar", month: MONTH, date: null, pendingDate: null, promptIndex: 0, time: "" };
export function plannerReducer(state, action) {
  switch (action.type) {
    case "month":
      return state.phase === "calendar" && [MONTH, LAST_MONTH].includes(action.month)
        ? { ...state, month: action.month } : state;
    case "select": {
      if (state.phase !== "calendar" || !isAvailableDate(action.date)) return state;
      const late = action.date >= "2026-11-17" && action.date <= "2026-11-22";
      return { ...state, date: late ? null : action.date, pendingDate: late ? action.date : null,
        promptIndex: 0, phase: late ? "prompt" : "time", time: "" };
    }
    case "earlier":
      return state.phase === "prompt"
        ? { ...state, phase: "calendar", pendingDate: null, date: null, promptIndex: 0 } : state;
    case "keep":
      if (state.phase !== "prompt" || !isAvailableDate(state.pendingDate)) return state;
      return state.promptIndex < 2
        ? { ...state, promptIndex: state.promptIndex + 1 }
        : { ...state, phase: "time", date: state.pendingDate, pendingDate: null, promptIndex: 0 };
    case "confirm":
      return state.phase === "time" && isAvailableDate(state.date) && /^([01]\d|2[0-3]):[0-5]\d$/.test(action.time)
        ? { ...state, time: action.time, phase: "confirmed" } : state;
    default: return state;
  }
}
