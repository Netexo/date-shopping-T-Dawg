import { questions } from "../lib/content";

export default function Questions({ answers, editable = false, onChange }) {
  return <section className="friendbook-questions" aria-label="Vier Fragen">
    {questions.map(({id,title,answer},index) => <div className="friendbook-question" key={id}>
      <span className="friendbook-question-number" aria-hidden="true">0{index + 1}</span>
      <div>{editable ? <><label htmlFor={id}>{title}</label><textarea id={id} name={id} rows={4} maxLength={10000} value={answers[id]} onChange={event => onChange(id,event.target.value)} placeholder="Deine Antwort …" /></> : <><h2>{title}</h2><p>{answer}</p></>}</div>
    </div>)}
  </section>;
}
