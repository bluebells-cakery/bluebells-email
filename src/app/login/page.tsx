export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const sp = await searchParams;
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#fbe7e6", fontFamily: "Poppins, system-ui, sans-serif", color: "#262967" }}>
      <form method="post" action="/api/login" style={{ background: "#fffdf8", padding: "36px 32px", borderRadius: 20, width: 340, boxShadow: "0 10px 30px rgba(38,41,103,.12)", display: "grid", gap: 14 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 500 }}>Bluebells EDM</h1>
        <p style={{ margin: 0, fontSize: 14, opacity: .75 }}>Team password to continue.</p>
        <input type="hidden" name="next" value={sp.next || "/dashboard"} />
        <input id="password" name="password" type="password" autoFocus required placeholder="Password" style={{ height: 46, borderRadius: 10, border: "1px solid #d9d4e3", padding: "0 14px", fontSize: 16 }} />
        {sp.error && <p style={{ margin: 0, color: "#b3261e", fontSize: 13 }}>That password isn&apos;t right.</p>}
        <button type="submit" style={{ height: 46, borderRadius: 100, border: 0, background: "#262967", color: "#fff", fontSize: 15, cursor: "pointer" }}>Log in</button>
      </form>
    </main>
  );
}
