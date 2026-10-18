import { profileFields, questions } from "./content.js";
import { validLocation } from "../../lib/location.js";
import { parseAppointment } from "../../shop/lib/appointment.js";
import { BackendError } from "../../lib/backend-error.js";

const object = value => value && typeof value === "object" && !Array.isArray(value);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validateEntry(input) {
  const invalid = () => { throw new BackendError("Bitte prüfe deinen Steckbrief, deine Antworten und den ausgewählten Standort.", 400); };
  if (!object(input) || Object.keys(input).some(key => !["idempotencyKey","profile","answers","location","date","time"].includes(key)) || typeof input.idempotencyKey !== "string" || !uuid.test(input.idempotencyKey) || !validLocation(input.location)) invalid();
  const clean = (value, fields, maximum) => {
    if (!object(value) || Object.keys(value).some(key => !fields.includes(key))) invalid();
    return Object.fromEntries(fields.map(key => {
      if (typeof value[key] !== "string" || value[key].length > maximum) invalid();
      return [key, value[key].trim()];
    }));
  };
  const profile = clean(input.profile,profileFields.map(field => field.id),200);
  const answers = clean(input.answers,questions.map(question => question.id),10000);
  if (!profile.name || (profile.age && (!/^\d{1,3}$/.test(profile.age) || Number(profile.age) > 120))) invalid();
  if ((input.date !== undefined || input.time !== undefined) && !parseAppointment(input.date,input.time)) invalid();
  return { idempotencyKey: input.idempotencyKey.toLowerCase(), profile, answers,
    location: input.location, ...(input.date !== undefined ? {date:input.date,time:input.time} : {}) };
}
export function validEntryRecord(entry) {
  try {
    const {id,requestHash,created_at,status,questionTitles,...input} = entry;
    validateEntry(input);
    return uuid.test(id) && typeof requestHash === "string" && Number.isFinite(Date.parse(created_at)) && status === "completed"
      && object(questionTitles) && questions.every(({id}) => typeof questionTitles[id] === "string");
  } catch { return false; }
}
