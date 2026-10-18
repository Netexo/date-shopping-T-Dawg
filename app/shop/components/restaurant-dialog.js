import { useEffect, useRef, useState } from "react";

export default function RestaurantDialog({ variant, canChooseAsian, onConfirm }) {
  const dialogRef = useRef(null);
  const [step, setStep] = useState(1);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return <dialog ref={dialogRef} className="shop-welcome restaurant-dialog" aria-labelledby="restaurant-question" onCancel={event => event.preventDefault()}>
    <h2 id="restaurant-question" aria-live="polite">{step === 1 ? "Sicher, dass du kein asiatisch willst?" : step === 2 ? "Hier nochmal ein paar gute Gründe für asiatisches Essen:" : "Wirklich ganz sicher? Letzte Chance für asiatisch."}</h2>
    {step === 2 && <ol>
      <li>Dumplings. Mehr muss man eigentlich nicht sagen.</li>
      <li>Sushi, Ramen, Curry – die Auswahl ist riesig.</li>
      <li>Mit Stäbchen essen macht alles direkt interessanter.</li>
      <li>Es schmeckt einfach verdammt gut.</li>
    </ol>}
    {!canChooseAsian && <p>Für Asiate brauchst du 35 Credits. Dein verfügbares Guthaben reicht dafür gerade nicht.</p>}
    <div className="restaurant-dialog-actions">
      <button type="button" className="welcome-confirm" disabled={!canChooseAsian} onClick={() => onConfirm("asian")}>{step === 1 ? "Okay, doch asiatisch" : step === 2 ? "Überzeugt, asiatisch!" : "Na gut, asiatisch"}</button>
      <button type="button" className="welcome-confirm restaurant-keep" onClick={() => step < 3 ? setStep(step + 1) : onConfirm(variant)}>{step === 1 ? "Ja, bin ich" : step === 2 ? "Ich bleibe bei meiner Wahl" : "Ja, wirklich sicher!"}</button>
    </div>
  </dialog>;
}
