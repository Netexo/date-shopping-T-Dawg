import { useEffect, useRef } from "react";
import { formatDate } from "../lib/planner";

const prompts = [
  { text: "So viel Geduld hast du?", earlier: "Lieber einen früheren Termin", keep: "Ja, hab ich" },
  { text: "Bist du dir sicher? Bis dahin ist ja noch eine Ewigkeit.", earlier: "Okay, früher", keep: "Ich kann warten" },
  { text: "Also ich hätte ja schon ein bisschen früher Zeit ...", earlier: "Na gut, früher", keep: "Ich bleibe dabei" },
];

export default function SelectionDialog({ step, date, onEarlier, onKeep }) {
  const dialogRef = useRef(null);
  const headingRef = useRef(null);
  const prompt = prompts[step];

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  useEffect(() => { headingRef.current.focus(); }, [step]);

  return <dialog ref={dialogRef} className="selection-dialog" aria-labelledby="prompt-title" aria-describedby="pending-date"
    onCancel={event => { event.preventDefault(); onEarlier(); }}>
    <div key={step} className="selection-dialog-content">
      <p className="eyebrow">Kleine Nachfrage · {step + 1} / 3</p>
      <h2 id="prompt-title" ref={headingRef} tabIndex={-1}>{prompt.text}</h2>
      <p id="pending-date" className="muted">Deine Auswahl: {formatDate(date)}</p>
      <div className="dialog-actions">
        <button type="button" className="planner-button" onClick={onEarlier}>{prompt.earlier}</button>
        <button type="button" className="planner-button secondary" onClick={onKeep}>{prompt.keep}</button>
      </div>
    </div>
  </dialog>;
}
