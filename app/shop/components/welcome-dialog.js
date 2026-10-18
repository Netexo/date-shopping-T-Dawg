import { useEffect, useRef } from "react";

const SESSION_KEY = "date-shopping.welcome-seen";
let seenWithoutStorage = false;

export default function WelcomeDialog() {
  const dialogRef = useRef(null);
  const shouldShowRef = useRef(null);
  const previousOverflowRef = useRef("");

  useEffect(() => {
    // Keep this decision through React's development effect replay.
    if (shouldShowRef.current === null) {
      try {
        shouldShowRef.current = sessionStorage.getItem(SESSION_KEY) !== "true";
      } catch {
        shouldShowRef.current = !seenWithoutStorage;
      }
    }
    if (!shouldShowRef.current) return;

    const dialog = dialogRef.current;
    previousOverflowRef.current = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    try {
      sessionStorage.setItem(SESSION_KEY, "true");
    } catch {
      seenWithoutStorage = true;
    }

    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflowRef.current;
    };
  }, []);

  function dismiss() {
    shouldShowRef.current = false;
    dialogRef.current.close();
    document.body.style.overflow = previousOverflowRef.current;
  }

  return (
    <dialog
      ref={dialogRef}
      className="shop-welcome"
      aria-labelledby="welcome-title"
      aria-describedby="welcome-description"
      onKeyDown={(event) => { if (event.key === "Escape") event.preventDefault(); }}
      onCancel={(event) => event.preventDefault()}
    >
      <h2 id="welcome-title">Hey Britta!</h2>
      <p id="welcome-description">Kurze Info: Du hast 100 Credits und kannst dir damit verschiedene Aktivitäten aussuchen. Oben rechts siehst du immer deinen aktuellen Kontostand. Wenn du fertig bist, geh einfach auf Checkout.</p>
      <button type="button" className="welcome-confirm" onClick={dismiss}>Alles klar!</button>
    </dialog>
  );
}
