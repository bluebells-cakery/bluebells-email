import { card, wrap, input, button } from "../styles";
const ERR: Record<string, string> = { "1": "That code isn't right or has expired — use the newest email, or start again.", short: "Password needs at least 10 characters.", match: "The two passwords don't match." };
export default async function Code({ searchParams }: { searchParams: Promise<{ error?: string; next?: string; e?: string; mode?: string }> }) {
  const sp = await searchParams; const reset = sp.mode === "reset";
  return (
    <main style={wrap}>
      <form method="post" action="/api/login/code" style={card}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 500 }}>Check your email</h1>
        <p style={{ margin: 0, fontSize: 14, opacity: .75 }}>{reset ? `If ${sp.e || "that email"} has a login, a` : "A"} 6-digit code is on its way to {reset ? "it" : sp.e || "your inbox"}. It works for 10 minutes.</p>
        <input type="hidden" name="next" value={sp.next || "/dashboard"} />
        <input type="hidden" name="e" value={sp.e || ""} />
        <input type="hidden" name="mode" value={reset ? "reset" : ""} />
        <input name="code" inputMode="numeric" pattern="[0-9 ]*" autoComplete="one-time-code" autoFocus required placeholder="123456" style={{ ...input, letterSpacing: 6, textAlign: "center", fontSize: 22 }} />
        {reset && <>
          <input name="password" type="password" required minLength={10} placeholder="New password (10+ characters)" autoComplete="new-password" style={input} />
          <input name="password2" type="password" required minLength={10} placeholder="Same password again" autoComplete="new-password" style={input} />
        </>}
        {sp.error && <p style={{ margin: 0, color: "#b3261e", fontSize: 13 }}>{ERR[sp.error] ?? ERR["1"]}</p>}
        <button type="submit" style={button}>{reset ? "Save password and log in" : "Log in"}</button>
        <a href="/login" style={{ fontSize: 13, textAlign: "center", color: "#262967" }}>Start again</a>
      </form>
    </main>
  );
}
