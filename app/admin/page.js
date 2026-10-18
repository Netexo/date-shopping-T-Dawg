import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { orderStore } from "../lib/server/order-store";
import { friendbookStore } from "../lib/server/friendbook-store";
import { BackendError } from "../lib/backend-error";
import { profileFields } from "../friendbook/lib/content";
import { parseAppointment } from "../shop/lib/appointment";
import "./admin.css";

export const metadata = { title: "Übersicht | Order a Date", robots: { index: false, follow: false } };
const timestamp = value => new Intl.DateTimeFormat("de-DE", {dateStyle:"medium",timeStyle:"short",timeZone:"Europe/Paris"}).format(new Date(value));
const appointmentLabel = entry => parseAppointment(entry.date,entry.time)?.label || "Kein Termin angegeben";
async function loadAll(factory, key) {
  try {
    const store = factory();
    const values = [];
    let page = 0;
    let result;
    do { result = await store.list(page++); values.push(...result[key]); } while (result.hasMore);
    return {values,error:""};
  } catch (error) {
    return {values:[],error:error instanceof BackendError ? error.message : "Die Daten konnten nicht geladen werden. Bitte erneut versuchen."};
  }
}
function OrderDetails({ order }) {
  return <>
    <p>{order.location || "Kein Standort angegeben"} · {appointmentLabel(order)}</p>
    <ul className="admin-items">{order.items.map(item => <li key={item.id}><span>{item.name}</span><span>{item.credits} Credits</span></li>)}</ul>
    <dl><div><dt>Gesamtverbrauch</dt><dd>{order.spent} Credits</dd></div><div><dt>Restguthaben</dt><dd>{order.remaining} Credits</dd></div><div><dt>Bestellt</dt><dd>{timestamp(order.created_at)} Uhr (Paris)</dd></div></dl>
    <p className="admin-id">{order.id}</p>
  </>;
}
async function Dashboard() {
  await connection();
  const [orders,entries] = await Promise.all([loadAll(orderStore,"orders"),loadAll(friendbookStore,"entries")]);
  return <>
    <section id="orders" aria-labelledby="orders-title">
      <h2 id="orders-title">Bestellungen</h2>
      {orders.error ? <p role="alert">{orders.error}</p> : !orders.values.length ? <p>Noch keine Bestellungen eingegangen.</p> : orders.values.map(order => <details className="admin-card" key={order.id}><summary>{order.location || "Bestellung"} · {appointmentLabel(order)}</summary><OrderDetails order={order} /></details>)}
    </section>
    <section id="friendbook" aria-labelledby="friendbook-title">
      <h2 id="friendbook-title">Freundesbuch-Einträge</h2>
      {entries.error ? <p role="alert">{entries.error}</p> : !entries.values.length ? <p>Noch keine Freundesbuch-Einträge eingegangen.</p> : entries.values.map(entry => {
        const linked = orders.values.filter(order => order.friendbookId === entry.id);
        return <details className="admin-card" key={entry.id}>
          <summary>{entry.profile.name || "Eintrag"}{entry.profile.age ? ` · ${entry.profile.age} Jahre` : ""} · {entry.location}</summary>
          <dl>{profileFields.map(({id,label}) => <div key={id}><dt>{label}</dt><dd>{entry.profile[id] || "—"}</dd></div>)}
            <div><dt>Standort</dt><dd>{entry.location}</dd></div><div><dt>Termin</dt><dd>{appointmentLabel(entry)}</dd></div><div><dt>Erstellt</dt><dd>{timestamp(entry.created_at)} Uhr (Paris)</dd></div>
            <div><dt>Status</dt><dd>{orders.error ? "Bestellstatus nicht verfügbar" : linked.length ? "Bestellung abgeschlossen" : "Freundesbuch abgeschlossen"}</dd></div>
          </dl>
          {Object.entries(entry.questionTitles).map(([id,title]) => <div className="admin-answer" key={id}><h3>{title}</h3><p>{entry.answers[id] || "—"}</p></div>)}
          <h3>Zugehörige Bestellungen</h3>
          {orders.error ? <p>{orders.error}</p> : linked.length ? linked.map(order => <div className="admin-linked" key={order.id}><OrderDetails order={order} /></div>) : <p>Noch keine Bestellung abgegeben.</p>}
          <p className="admin-id">{entry.id}</p>
        </details>;
      })}
    </section>
  </>;
}
export default function AdminPage() {
  return <main className="admin-page">
    <header className="admin-header"><Link href="/">Order a Date</Link><a href="/admin">Aktualisieren</a></header>
    <div className="admin-content"><h1>Übersicht</h1><nav className="admin-sections" aria-label="Bereiche"><a href="#orders">Bestellungen</a><a href="#friendbook">Freundesbuch-Einträge</a></nav>
      <Suspense fallback={<p role="status">Daten werden geladen.</p>}><Dashboard /></Suspense>
    </div>
  </main>;
}
