import { profileFields, questions } from "./content.js";

export const ENTRY_STORAGE_KEY = "order-a-date.friendbook.v1";
export function emptyEntry() {
  return { profile: Object.fromEntries(profileFields.map(({ id }) => [id, ""])),
    answers: Object.fromEntries(questions.map(({ id }) => [id, ""])) };
}
export function loadEntry(storage) {
  const raw = JSON.parse(storage.getItem(ENTRY_STORAGE_KEY) || "null");
  const entry = emptyEntry();
  for (const section of ["profile", "answers"]) {
    for (const key of Object.keys(entry[section])) {
      if (typeof raw?.[section]?.[key] === "string") entry[section][key] = raw[section][key];
    }
  }
  return { ...entry, completed: raw?.completed === true };
}
// Keep persistence separate so a future backend can use the same entry structure.
export function saveEntry(storage, entry, appointment, completed = false) {
  storage.setItem(ENTRY_STORAGE_KEY, JSON.stringify({
    profile: entry.profile, answers: entry.answers,
    appointment: { date: appointment.date, time: appointment.time }, completed,
  }));
}
