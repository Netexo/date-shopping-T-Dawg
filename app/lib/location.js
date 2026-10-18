export const LOCATIONS = ["Frankfurt", "Mainz"];
export const LOCATION_STORAGE_KEY = "order-a-date.location.v1";
export function validLocation(value) {
  return LOCATIONS.includes(value);
}
export function loadLocation(storage) {
  const value = storage.getItem(LOCATION_STORAGE_KEY);
  return validLocation(value) ? value : "";
}
export function saveLocation(storage, value) {
  if (!validLocation(value)) throw new Error("Bitte wähle Frankfurt oder Mainz.");
  storage.setItem(LOCATION_STORAGE_KEY, value);
}
