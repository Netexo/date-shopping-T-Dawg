import Link from "next/link";

export default function Home() {
  return (
    <main className="landing">
      <h1 className="landing-title">Order a Date</h1>
      <Link className="start-button" href="/location">
        Start
      </Link>
    </main>
  );
}
