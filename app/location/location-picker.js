"use client";

import Link from "next/link";
import { useEffect, useReducer } from "react";
import { useRouter } from "next/navigation";
import { LOCATIONS, loadLocation, saveLocation } from "../lib/location";

export default function LocationPicker() {
  const [state, update] = useReducer((current, patch) => ({ ...current, ...patch }), { city: "", ready: false, error: "" });
  const router = useRouter();
  useEffect(() => {
    try { update({ city: loadLocation(localStorage), ready: true }); }
    catch { update({ ready: true }); }
  }, []);
  function proceed(event) {
    event.preventDefault();
    try {
      saveLocation(localStorage, state.city);
      router.push("/calendar");
    } catch { update({ error: "Deine Auswahl konnte nicht gespeichert werden. Bitte erlaube den lokalen Browserspeicher." }); }
  }
  return <main className="location-page">
    <nav><Link href="/">Order a Date</Link></nav>
    <form onSubmit={proceed} className="location-content">
      <h1>Where should we meet?</h1>
      <fieldset disabled={!state.ready}>
        <legend>Wähle den Ort unseres Treffens</legend>
        <div className="location-options">{LOCATIONS.map(city => <label className="location-card" key={city}>
          <input type="radio" name="location" value={city} checked={state.city === city} onChange={() => update({ city, error: "" })} />
          <span>{city}</span>
        </label>)}</div>
      </fieldset>
      {state.error && <p role="alert">{state.error}</p>}
      <button className="start-button" type="submit" disabled={!state.ready || !state.city}>Weiter</button>
    </form>
  </main>;
}
