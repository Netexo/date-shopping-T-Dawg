import { formatDate, monthCells, MONTH, LAST_MONTH } from "../lib/planner";
import { isAvailableDate } from "../../lib/availability";

const weekdays = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
export default function MonthCalendar({ month, selectedDate, onSelect, onMonthChange }) {
  return (
    <section className="month-calendar" aria-labelledby="month-title">
      <header className="month-header">
        <h1 id="month-title" aria-live="polite">{month === MONTH ? "Oktober" : "November"} <span>2026</span></h1>
        <span className="month-label">Ein guter Monat für ein Date.</span>
        <nav className="month-navigation" aria-label="Monat wechseln">
          <button type="button" aria-label="Vorheriger Monat" disabled={month === MONTH || !!selectedDate} onClick={() => onMonthChange(month - 1)}>←</button>
          <button type="button" aria-label="Nächster Monat" disabled={month === LAST_MONTH || !!selectedDate} onClick={() => onMonthChange(month + 1)}>→</button>
        </nav>
      </header>
      <div className="weekdays" aria-hidden="true">
        {weekdays.map((day) => <span key={day}><span className="weekday-full">{day}</span><span className="weekday-short">{day.slice(0, 2)}</span></span>)}
      </div>
      <div className="month-grid">
        {monthCells(month).map(({ day, currentMonth, date }) => {
          if (!currentMonth) return <div className="day-cell outside-month" key={date} aria-hidden="true"><span className="day-number">{day}</span></div>;
          const available = isAvailableDate(date);
          return <button key={date} type="button" disabled={!available || !!selectedDate}
            className={`day-cell${available ? " available-day" : " unavailable-day"}${selectedDate === date ? " selected-day" : ""}`}
            aria-pressed={selectedDate === date} aria-label={`${formatDate(date)}: ${available ? "verfügbar" : "nicht verfügbar"}`}
            onClick={() => onSelect(date)}><span className="day-number">{day}</span></button>;
        })}
      </div>
    </section>
  );
}
