import { useEffect, useRef } from "react";
import { formatDate } from "../lib/planner";

const prompts = [
  { text: "Bist du dir sicher? Der 27.10. wäre doch eigentlich perfekt?", accept: "Okay, 27.10.", keep: "Nein, anderer Tag" },
  { text: "Aber am 27.10. ist Nicks Praktikum endlich vorbei.", accept: "Na gut, 27.10.", keep: "Ich bleibe dabei" },
  { text: "Letzte Chance! Der 27.10. hat wirklich hervorragende Bewertungen!", accept: "Überzeugt! 27.10.", keep: "Nein, wirklich nicht" },
];

export default function SelectionDialog({ step, pendingDay, onSwitch, onKeep, onCancel }) {
  const dialogRef = useRef(null);
  const headingRef = useRef(null);
  const prompt = prompts[step];

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  useEffect(() => { headingRef.current.focus(); }, [step]);

  return (
    <dialog ref={dialogRef} className="selection-dialog" aria-labelledby="prompt-title" aria-describedby="original-date" onCancel={(event) => { event.preventDefault(); onCancel(); }}>
      <button type="button" className="dialog-close" aria-label="Datumsauswahl abbrechen" onClick={onCancel}>×</button>
      <p className="eyebrow">Kleine Nachfrage · {step + 1} / 3</p>
      <h2 id="prompt-title" ref={headingRef} tabIndex={-1}>{prompt.text}</h2>
      <p id="original-date" className="muted">Deine Auswahl: {formatDate(pendingDay)}</p>
      <div className="dialog-actions">
        <button className="planner-button" type="button" onClick={onSwitch}>{prompt.accept}</button>
        <button className="planner-button secondary" type="button" onClick={onKeep}>{prompt.keep}</button>
      </div>
    </dialog>
  );
}
