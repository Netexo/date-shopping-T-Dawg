"use client";

import Link from "next/link";
import { useEffect, useReducer, useRef } from "react";
import { useRouter } from "next/navigation";
import { initialSelection, plannerReducer } from "../lib/planner";
import MonthCalendar from "./month-calendar";
import TimePicker from "./time-picker";
import SelectionDialog from "./selection-dialog";

export default function DatePlanner() {
  const [selection, dispatch] = useReducer(plannerReducer, initialSelection);
  const contentRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    if (selection.phase === "confirmed") {
      router.replace(`/friendbook?${new URLSearchParams({ date: selection.date, time: selection.time })}`);
    }
    if (selection.phase === "time") {
      contentRef.current.querySelector(".planner-step h1")?.focus();
    }
  }, [selection.phase, selection.date, selection.time, router]);

  return (
    <main className="planner-shell">
      <nav className="planner-nav" aria-label="Hauptnavigation"><Link href="/">Date Shopping</Link><Link href="/location">Standort ändern</Link></nav>
      <div className={`planner-content${["time", "confirmed"].includes(selection.phase) ? " centered" : ""}`} ref={contentRef}>
        {(["calendar", "prompt", "time"].includes(selection.phase)) && (
          <MonthCalendar month={selection.month} selectedDate={selection.date} onMonthChange={(month) => dispatch({ type: "month", month })} onSelect={(date) => dispatch({ type: "select", date })} />
        )}
        {selection.phase === "prompt" && <SelectionDialog step={selection.promptIndex} date={selection.pendingDate}
          onEarlier={() => dispatch({ type: "earlier" })} onKeep={() => dispatch({ type: "keep" })} />}
        {selection.phase === "time" && <TimePicker date={selection.date} onConfirm={(time) => dispatch({ type: "confirm", time })} />}
        {selection.phase === "confirmed" && <p role="status">Dein Freundesbuch wird geöffnet.</p>}
      </div>
    </main>
  );
}
