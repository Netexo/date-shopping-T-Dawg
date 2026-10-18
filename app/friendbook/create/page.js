import { Suspense } from "react";
import Friendbook from "../components/friendbook";
export default function CreateEntryPage() {
  return <Suspense fallback={<main className="friendbook-page" aria-busy="true">Freundesbuch wird geladen.</main>}><Friendbook create /></Suspense>;
}
