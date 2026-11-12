import { card, wrap, input, button } from "../styles";
export default async function Code({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const sp = await searchParams;
  return (
    <main style={wrap}>
      <form method="post" action="/api/login/code" style={card}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 500 }}>Phone code</h1>
        <p style={{ margin: 0, fontSize: 14, opacity: .75 }}>Enter the 6-digit code from your authenticator app.</p>
        <input type="hidden" name="next" value={sp.next || "/dashboard"} />
        <input name="code" inputMode="numeric" pattern="[0-9 ]*" autoComplete="one-time-code" autoFocus required placeholder="123 456" style={{ ...input, letterSpacing: 4, textAlign: "center", fontSize: 20 }} />
        {sp.error && <p style={{ margin: 0, color: "#b3261e", fontSize: 13 }}>That code isn&apos;t right — try the newest one.</p>}
        <button type="submit" style={button}>Log in</button>
      </form>
    </main>
  );
}
