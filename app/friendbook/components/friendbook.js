"use client";

import Link from "next/link";
import { useEffect, useReducer, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { readAppointment } from "../../shop/lib/appointment";
import { myProfile, photo } from "../lib/content";
import { emptyEntry, loadEntry, saveEntry } from "../lib/storage";
import { loadLocation } from "../../lib/location";
import { submitEntry } from "../lib/submission";
import Profile from "./profile";
import Questions from "./questions";
import WelcomeDialog from "./welcome-dialog";

export default function Friendbook({ create = false }) {
  const submitting = useRef(false);
  const params = useSearchParams();
  const appointment = readAppointment(params.get("date"), params.get("time"));
  const [state, update] = useReducer((current, patch) => ({ ...current, ...patch }),
    { entry: emptyEntry(), loaded: false, completed: false, saving: false, error: "" });
  useEffect(() => {
    if (!create) return;
    try {
      const saved = loadEntry(window.localStorage);
      update({ entry: saved, loaded: true, completed: false });
    } catch { update({ loaded: true, error: "Dein gespeicherter Eintrag konnte nicht geladen werden. Du kannst ihn erneut ausfüllen." }); }
  }, [create]);

  const href = (pathname) => ({ pathname, query: { date: appointment.date, time: appointment.time } });
  function change(section, key, value) {
    const entry = { ...state.entry, [section]: { ...state.entry[section], [key]: value } };
    let error = "";
    try { saveEntry(window.localStorage, entry, appointment); }
    catch { error = "Dein Entwurf konnte nicht gespeichert werden. Bitte erlaube den lokalen Browserspeicher."; }
    update({ entry, completed: false, error });
  }
  async function complete(event) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    update({saving:true,error:""});
    try {
      const location = loadLocation(window.localStorage);
      if (!location) throw new Error("Bitte wähle zuerst einen Standort aus.");
      await submitEntry(window.localStorage,{
        profile:state.entry.profile, answers:state.entry.answers, location,
        ...(appointment ? {date:appointment.date,time:appointment.time} : {}),
      });
      update({ completed: true, error: "" });
    } catch (error) { update({ error: error.message || "Dein Eintrag konnte nicht gespeichert werden. Bitte versuche es erneut." }); }
    finally { submitting.current = false; update({saving:false}); }
  }

  return <main className="friendbook-page">
    {!create && appointment && <WelcomeDialog />}
    <nav className="friendbook-nav" aria-label="Hauptnavigation"><Link href="/">Order a Date</Link><span>Das Freundesbuch</span></nav>
    <div className="friendbook-content">
      {!appointment ? <section><h1>Dein Date fehlt noch.</h1><p>Wähle zuerst ein verfügbares Datum und eine Uhrzeit.</p><Link className="friendbook-button" href="/calendar">Zur Terminplanung</Link></section> : <>
        <header className="friendbook-heading"><p className="friendbook-kicker">Ein bisschen mehr über uns</p><h1>{create ? "Dein Eintrag" : "Mein Eintrag"}</h1><p>{appointment.label}</p></header>
        {create ? !state.loaded ? <p role="status">Dein Eintrag wird geladen.</p> : state.completed ? <section className="friendbook-confirmation" aria-labelledby="entry-completed">
          <h2 id="entry-completed">Dein Eintrag wurde erstellt.</h2><p>Danke, dass du ein Stück von dir hierlässt.</p>
          <div className="friendbook-actions"><Link className="friendbook-button" href={href("/shop")}>Weiter zum Shop</Link><button className="friendbook-text-button" onClick={() => update({ completed: false })}>Eintrag bearbeiten</button></div>
        </section> : <form onSubmit={complete} aria-busy={state.saving}>
          <fieldset disabled={state.saving} className="friendbook-entry-fields">
          <Profile editable values={state.entry.profile} onChange={(key,value) => change("profile",key,value)} />
          <Questions editable answers={state.entry.answers} onChange={(key,value) => change("answers",key,value)} />
          </fieldset>
          {state.error && <p className="friendbook-error" role="alert">{state.error}</p>}
          <p className="friendbook-privacy">Deine Angaben werden privat gespeichert, um unser Treffen zu planen. Sie sind nur für die Verwaltung des Treffens einsehbar.</p>
          <div className="friendbook-actions"><button className="friendbook-button" type="submit" disabled={state.saving}>{state.saving ? "Wird gespeichert …" : "Eintrag abschließen"}</button><Link className="friendbook-text-button" href={href("/friendbook")}>Zurück zu meinem Eintrag</Link></div>
        </form> : <>
          <Profile values={myProfile} photo={photo} /><Questions />
          <Link className="friendbook-button" href={href("/friendbook/create")}>Erstelle deinen Eintrag</Link>
        </>}
      </>}
    </div>
  </main>;
}
