"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useReducer, useRef } from "react";
import useCart from "../../shop/components/use-cart";
import { readAppointment } from "../../shop/lib/appointment";
import { checkoutDraft, completeOrder, findCompletedOrder } from "../lib/order";

import { loadLocation } from "../../lib/location";

import { loadEntryReference } from "../../friendbook/lib/submission";

const initialStatus = { signature: null, ready: false, order: null, error: "", submitting: false };

export default function Checkout() {
  const params = useSearchParams();
  const appointment = readAppointment(params.get("date"), params.get("time"));
  const cart = useCart();
  const entries = cart.items.map(({ id, variantId }) => variantId ? { id, variantId } : { id });
  const [friendbook,setFriendbook] = useReducer((_,value) => value,null);
  const [location, setLocation] = useReducer((_, value) => value, "");
  useEffect(() => {
    try { setLocation(loadLocation(localStorage)); setFriendbook(loadEntryReference(localStorage)); } catch { /* Show the location selection link below. */ }
  }, []);
  const draft = checkoutDraft(appointment, entries, location, friendbook);
  const signature = draft?.signature || null;
  const [status, updateStatus] = useReducer((state, patch) => ({ ...state, ...patch }), initialStatus);
  const submittingRef = useRef(false);
  const confirmationRef = useRef(null);
  const shopHref = appointment ? { pathname: "/shop", query: { date: appointment.date, time: appointment.time } } : "/shop";

  useEffect(() => {
    if (!cart.ready) return;
    try {
      const savedSelection = signature ? JSON.parse(signature) : null;
      const currentDraft = savedSelection ? checkoutDraft({ date: savedSelection[0], time: savedSelection[1] }, savedSelection[2], savedSelection[3], savedSelection[4]) : null;
      const order = findCompletedOrder(localStorage, currentDraft);
      updateStatus({ signature, ready: true, order, error: "" });
    } catch {
      updateStatus({ signature, ready: true, order: null, error: "Die Bestellung konnte nicht geladen werden. Bitte erlaube den lokalen Browserspeicher." });
    }
  }, [cart.ready, signature]);

  useEffect(() => {
    if (status.order) confirmationRef.current?.focus();
  }, [status.order]);

  async function finish() {
    if (!friendbook || !draft || !cart.ready || !status.ready || status.signature !== signature || status.order || submittingRef.current) return;
    submittingRef.current = true;
    updateStatus({ submitting: true, error: "" });
    try {
      const order = await completeOrder(localStorage, draft);
      updateStatus({ order, error: "" });
    } catch (error) {
      updateStatus({ error: error.message || "Die Bestellung konnte nicht gespeichert werden. Bitte versuche es erneut." });
    } finally {
      submittingRef.current = false;
      updateStatus({ submitting: false });
    }
  }

  const ready = cart.ready && status.ready && status.signature === signature;

  return (
    <main className="checkout-page">
      <section className="checkout-window" aria-labelledby="checkout-title" aria-busy={!ready}>
        {!ready ? <p className="checkout-loading" role="status">Zusammenfassung wird geladen.</p> : status.order ? (
          <div className="checkout-success">
            <h1 id="checkout-title" ref={confirmationRef} tabIndex={-1}>It&apos;s a Date!</h1>
            <p>Deine Bestellung wurde erfolgreich aufgegeben.</p>
            <p className="checkout-success-date">{status.order.location} · {status.order.appointment.label}</p>
          </div>
        ) : (
          <>
            <h1 id="checkout-title">YOUR DATE SUMMARY</h1>
            <section className="checkout-section" aria-labelledby="date-time-title">
              <h2 id="date-time-title">Location, Date &amp; Time</h2>
              {location ? <p className="checkout-appointment">{location}</p> : <p className="checkout-missing">Bitte <Link href="/location">wähle zuerst einen Standort</Link>.</p>}
              {appointment ? <p className="checkout-appointment">{appointment.label}</p> : <p className="checkout-missing">Bitte wähle zuerst ein Datum und eine Uhrzeit im Terminplaner aus.</p>}
            </section>
            <section className="checkout-section" aria-labelledby="items-title">
              <h2 id="items-title">Your Items</h2>
              {cart.count ? <ul className="checkout-items">{cart.items.map((item) => <li key={item.id}><span>{item.name}</span><span>{item.points} Credits</span></li>)}</ul> : <p className="checkout-missing">Dein Warenkorb ist leer. Wähle zuerst Produkte im Shop aus.</p>}
            </section>
            <section className="checkout-section" aria-labelledby="order-title">
              <h2 id="order-title">Order Summary</h2>
              <dl className="checkout-totals"><div><dt>Ausgegebene Credits</dt><dd data-testid="checkout-spent">{cart.spent}</dd></div><div><dt>Verbleibendes Guthaben</dt><dd data-testid="checkout-remaining">{cart.remaining} Credits</dd></div></dl>
            </section>
            {!friendbook && <p className="checkout-missing">Bitte <Link href={appointment ? {pathname:"/friendbook/create",query:{date:appointment.date,time:appointment.time}} : "/friendbook/create"}>schließe zuerst deinen Freundesbuch-Eintrag ab</Link>, damit deine Bestellung zugeordnet werden kann.</p>}
            {status.error && <p className="checkout-error" role="alert">{status.error}</p>}
            <button type="button" className="checkout-finish" disabled={!friendbook || !draft || status.submitting} onClick={finish}>{status.submitting ? "WIRD GESPEICHERT …" : "EINKAUF ABSCHLIESSEN"}</button>
            <Link className="checkout-back" href={shopHref}>BACK TO SHOP</Link>
          </>
        )}
      </section>
    </main>
  );
}
