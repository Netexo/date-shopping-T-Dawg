import { useEffect, useReducer, useState } from "react";
import { profileFields } from "../../friendbook/lib/content";
import { parseAppointment } from "../../shop/lib/appointment";

const received = value => new Intl.DateTimeFormat("de-DE",{dateStyle:"medium",timeStyle:"short",timeZone:"Europe/Paris"}).format(new Date(value));
export default function FriendbookEntries() {
  const [state,update] = useReducer((current,patch) => ({...current,...patch}),{entries:[],loading:true,error:"",hasMore:false});
  const [page,setPage] = useState(0);
  const [revision,refresh] = useReducer(value => value + 1,0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      update({loading:true,error:""});
      try {
        const response = await fetch(`/api/friendbook?page=${page}`,{cache:"no-store",signal:controller.signal});
        const data = await response.json();
        if (response.status === 401 || response.status === 403) { window.location.replace("/admin/login"); return; }
        if (!response.ok) throw new Error(data.error || "Die Einträge konnten nicht geladen werden.");
        update({entries:data.entries,hasMore:data.hasMore,loading:false});
      } catch (error) { if (error.name !== "AbortError") update({loading:false,error:error.message}); }
    }
    load();
    return () => controller.abort();
  },[page,revision]);
  return <section aria-label="Freundesbuch-Einträge">
    <div className="admin-title-row"><h1>Freundesbuch-Einträge</h1><button className="admin-button secondary" onClick={refresh}>AKTUALISIEREN</button></div>
    {state.loading ? <p role="status">Einträge werden geladen.</p> : state.error ? <p role="alert">{state.error}</p> : <>
      {!state.entries.length && <p className="admin-empty">Noch keine Freundesbuch-Einträge eingegangen.</p>}
      <div className="admin-orders">{state.entries.map(entry => <details className="admin-order admin-friendbook" key={entry.id}>
        <summary>{entry.profile.name}{entry.profile.age ? ` · ${entry.profile.age} Jahre` : ""} · {entry.location}</summary>
        <dl>{profileFields.map(({id,label}) => <div key={id}><dt>{label}</dt><dd>{entry.profile[id] || "—"}</dd></div>)}
          <div><dt>Treffpunkt</dt><dd>{entry.location}</dd></div>
          <div><dt>Geplantes Treffen</dt><dd>{entry.date ? parseAppointment(entry.date,entry.time)?.label : "Kein Termin angegeben"}</dd></div>
          <div><dt>Erstellt</dt><dd>{received(entry.created_at)} Uhr (Paris)</dd></div>
        </dl>
        {Object.entries(entry.questionTitles).map(([id,title]) => <section className="admin-friendbook-answer" key={id}><h2>{title}</h2><p>{entry.answers[id] || "—"}</p></section>)}
        <p className="admin-order-id">{entry.id}</p>
      </details>)}</div>
      {(page > 0 || state.hasMore) && <nav className="admin-pagination" aria-label="Eintragsseiten"><button className="admin-button secondary" disabled={!page} onClick={() => setPage(page-1)}>NEUERE</button><span>Seite {page+1}</span><button className="admin-button secondary" disabled={!state.hasMore} onClick={() => setPage(page+1)}>ÄLTERE</button></nav>}
    </>}
  </section>;
}
