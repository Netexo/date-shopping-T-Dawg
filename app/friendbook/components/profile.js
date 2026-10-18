import Image from "next/image";
import { profileFields } from "../lib/content";

export default function Profile({ values, editable = false, onChange, photo }) {
  return <section className={`friendbook-profile${editable ? " friendbook-profile-editable" : ""}`} aria-label="Steckbrief">
    <div className="friendbook-details">
      <h2>Steckbrief</h2>
      {editable ? profileFields.map(({id,label,placeholder,type}) => <label className="friendbook-field" key={id} htmlFor={id}>
        <span>{label}</span><input id={id} name={id} type={type || "text"} min={type === "number" ? 0 : undefined} max={type === "number" ? 120 : undefined}
          required={id === "name"} maxLength={200} value={values[id]} placeholder={placeholder} onChange={event => onChange(id,event.target.value)} />
      </label>) : <dl>{profileFields.map(({id,label}) => <div key={id}><dt>{label}</dt><dd>{values[id]}</dd></div>)}</dl>}
    </div>
    {!editable && <div className="friendbook-photo">
      {photo?.src ?
        <Image src={photo.src} alt={photo.alt} fill sizes="(max-width: 680px) calc(100vw - 48px), (max-width: 1080px) calc((100vw - 144px) / 2), 468px" /> : <div className="friendbook-photo-placeholder"><svg viewBox="0 0 80 80" fill="none" aria-hidden="true"><circle cx="40" cy="27" r="13" /><path d="M14 68c0-15 12-25 26-25s26 10 26 25" /></svg><span>{editable ? "Dein Profilbild" : "Mein Profilbild"}</span><small>Platz für ein Foto</small></div>}
    </div>}
  </section>;
}
