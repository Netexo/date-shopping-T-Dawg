"use client";

import Link from "next/link";
import { useEffect, useReducer, useState } from "react";
import { parseAppointment } from "../../shop/lib/appointment";

import FriendbookEntries from "./friendbook-entries";

const initial = { phase: "loading", orders: [], hasMore: false, error: "" };
const received = (value) => new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" }).format(new Date(value));

export default function AdminDashboard() {
  const [area,setArea] = useState("orders");
  const [state, update] = useReducer((current, patch) => ({ ...current, ...patch }), initial);
  const [page, setPage] = useState(0);
  const [revision, refresh] = useReducer((value) => value + 1, 0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/orders?page=${page}`, { cache: "no-store", signal: controller.signal });
        const data = await response.json();
        if (response.status === 401 || response.status === 403) {
          update({ ...initial, phase: "loading" });
          window.location.replace("/admin/login");
        } else if (!response.ok) {
          update({ ...initial, phase: "orders", error: data.error || "Das Dashboard konnte nicht geladen werden." });
        } else update({ phase: "orders", orders: data.orders, hasMore: data.hasMore, error: "" });
      } catch (error) {
        if (error.name !== "AbortError") update({ ...initial, phase: "orders", error: "Keine Verbindung zum Server. Bitte versuche es erneut." });
      }
    }
    load();
    return () => controller.abort();
  }, [page, revision]);

  async function logout() {
    setBusy(true);
    try {
      const response = await fetch("/api/admin/logout", { method: "POST" });
      if (!response.ok) throw new Error("Abmeldung fehlgeschlagen. Bitte versuche es erneut.");
      update({ ...initial, phase: "loading" });
      window.location.replace("/admin/login");
    } catch (error) { update({ error: error.message }); }
    finally { setBusy(false); }
  }

  return (
    <main className="admin-page">
      <header className="admin-nav"><Link href="/">DATE SHOPPING</Link><span>PRIVATE / ADMIN</span></header>
      <div className={`admin-content${state.phase !== "orders" ? " admin-centered" : ""}`}>
        {state.phase === "loading" ? <p role="status">Dashboard wird geladen.</p> : <>
          <nav className="admin-sections" aria-label="Admin-Bereiche"><button className={`admin-button${area === "orders" ? "" : " secondary"}`} aria-pressed={area === "orders"} onClick={() => setArea("orders")}>Bestellungen</button><button className={`admin-button${area === "friendbook" ? "" : " secondary"}`} aria-pressed={area === "friendbook"} onClick={() => setArea("friendbook")}>Freundesbuch-Einträge</button>{area === "friendbook" && <button type="button" className="admin-button secondary" disabled={busy} onClick={logout}>ABMELDEN</button>}</nav>
          {area === "friendbook" && <FriendbookEntries />}
          <div hidden={area !== "orders"}>
          <div className="admin-title-row"><div><h1>Bestellungen</h1><p>Privater Bestelleingang</p></div><div className="admin-actions"><button type="button" onClick={() => refresh()} className="admin-button secondary">AKTUALISIEREN</button><button type="button" onClick={logout} className="admin-button" disabled={busy}>ABMELDEN</button></div></div>
          {state.error && <p className="admin-error" role="alert">{state.error}</p>}
          {state.orders.length === 0 ? <p className="admin-empty">Noch keine Bestellungen eingegangen.</p> : <div className="admin-orders">
            {state.orders.map((order) => <article className="admin-order" key={order.id}>
              <header><div><h2>{parseAppointment(order.date, order.time.slice(0, 5))?.label}</h2><p className="admin-order-id">{order.id}</p></div><span className="admin-status">Abgeschlossen</span></header>
              <ul>{order.items.map((item) => <li key={item.id}><span>{item.name}</span><span>{item.credits} Credits</span></li>)}</ul>
              <dl><div><dt>Standort</dt><dd>{order.location || "Kein Standort angegeben"}</dd></div><div><dt>Ausgegeben</dt><dd>{order.spent} Credits</dd></div><div><dt>Restguthaben</dt><dd>{order.remaining} Credits</dd></div><div><dt>Eingegangen</dt><dd>{received(order.created_at)} Uhr (Paris)</dd></div></dl>
            </article>)}
          </div>}
          {(page > 0 || state.hasMore) && <nav className="admin-pagination" aria-label="Bestellseiten"><button type="button" className="admin-button secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>NEUERE</button><span>Seite {page + 1}</span><button type="button" className="admin-button secondary" disabled={!state.hasMore} onClick={() => setPage(page + 1)}>ÄLTERE</button></nav>}
          </div>
        </>}
      </div>
    </main>
  );
}
