import { card, wrap, input, button } from "../styles";
export default async function Code({ searchParams }: { searchParams: Promise<{ error?: string; next?: string; e?: string }> }) {
  const sp = await searchParams;
  return (
    <main style={wrap}>
      <form method="post" action="/api/login/code" style={card}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 500 }}>Check your email</h1>
        <p style={{ margin: 0, fontSize: 14, opacity: .75 }}>If {sp.e || "that email"} has a login, a 6-digit code is on its way. It works for 10 minutes.</p>
        <input type="hidden" name="next" value={sp.next || "/dashboard"} />
        <input type="hidden" name="e" value={sp.e || ""} />
        <input name="code" inputMode="numeric" pattern="[0-9 ]*" autoComplete="one-time-code" autoFocus required placeholder="123456" style={{ ...input, letterSpacing: 6, textAlign: "center", fontSize: 22 }} />
        {sp.error && <p style={{ margin: 0, color: "#b3261e", fontSize: 13 }}>That code isn&apos;t right or has expired — use the newest email, or start again.</p>}
        <button type="submit" style={button}>Log in</button>
        <a href="/login" style={{ fontSize: 13, textAlign: "center", color: "#262967" }}>Use a different email / send a new code</a>
      </form>
    </main>
  );
}
