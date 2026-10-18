import { useEffect, useRef } from "react";

const SESSION_KEY = "order-a-date.friendbook.welcome-seen";
let seenWithoutStorage = false;

export default function WelcomeDialog() {
  const dialogRef = useRef(null);
  const previousOverflowRef = useRef("");

  useEffect(() => {
    let seen = seenWithoutStorage;
    try { seen = sessionStorage.getItem(SESSION_KEY) === "true"; }
    catch { /* Use the in-memory fallback when storage is unavailable. */ }
    if (seen) return;

    const dialog = dialogRef.current;
    previousOverflowRef.current = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflowRef.current;
    };
  }, []);

  function dismiss() {
    seenWithoutStorage = true;
    try { sessionStorage.setItem(SESSION_KEY, "true"); }
    catch { /* The in-memory fallback also prevents repeated prompts. */ }
    dialogRef.current.close();
    document.body.style.overflow = previousOverflowRef.current;
  }

  return <dialog
    ref={dialogRef}
    className="friendbook-welcome"
    aria-labelledby="friendbook-welcome-message"
    onCancel={event => event.preventDefault()}
  >
    <p id="friendbook-welcome-message">Nachdem wir ja schon persönliche Geschichten ausgetauscht haben, kommen wir nochmal zu den Basics.</p>
    <button type="button" className="friendbook-button" onClick={dismiss}>Alles klar!</button>
  </dialog>;
}
