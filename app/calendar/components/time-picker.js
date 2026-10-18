import { useState } from "react";
import { formatDate } from "../lib/planner";

export default function TimePicker({ date, onConfirm }) {
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");

  function submit(event) {
    event.preventDefault();
    if (hour !== "" && minute !== "") onConfirm(`${hour}:${minute}`);
  }

  return (
    <section className="planner-step" aria-labelledby="time-heading">
      <p className="eyebrow">{formatDate(date)}</p>
      <h1 id="time-heading" tabIndex={-1}>And what time<br />works for you?</h1>
      <form onSubmit={submit}>
        <fieldset className="time-fields">
          <legend>Ab dieser Uhrzeit bin ich verfügbar</legend>
          <label>Stunden<select required value={hour} onChange={(event) => setHour(event.target.value)} aria-label="Stunden"><option value="" disabled>––</option>{Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map((value) => <option key={value}>{value}</option>)}</select></label>
          <span className="time-colon" aria-hidden="true">:</span>
          <label>Minuten<select required value={minute} onChange={(event) => setMinute(event.target.value)} aria-label="Minuten"><option value="" disabled>––</option>{Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")).map((value) => <option key={value}>{value}</option>)}</select></label>
        </fieldset>
        <button type="submit" className="planner-button" disabled={hour === "" || minute === ""}>Continue</button>
      </form>
    </section>
  );
}
