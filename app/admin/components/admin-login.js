import Link from "next/link";

export default function AdminLogin() {
  return <main className="admin-page">
    <header className="admin-nav"><Link href="/">DATE SHOPPING</Link><span>PRIVATE / ADMIN</span></header>
    <div className="admin-content admin-centered">
      <section className="admin-login" aria-labelledby="admin-title">
        <h1 id="admin-title">Admin Dashboard</h1>
        <p>Der Zugriff ist auf dein freigegebenes GitHub-Konto beschränkt.</p>
        <a className="admin-button" href="/api/admin/authorize">Mit GitHub anmelden</a>
      </section>
    </div>
  </main>;
}
