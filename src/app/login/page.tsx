import { card, wrap, input, button } from "./styles";
const ERR: Record<string, string> = {
  "1": "That email or password isn't right.", locked: "Too many tries — locked for 15 minutes.",
  send: "Couldn't send the code just now. Try again in a minute.", nopw: "You haven't set a password yet — use \"First time or forgot password\" below.",
};

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const sp = await searchParams;
  return (
    <main style={wrap}>
      <form method="post" action="/api/login" style={card}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 500 }}>Bluebells EDM</h1>
        <input type="hidden" name="next" value={sp.next || "/dashboard"} />
        <input name="email" type="email" autoFocus required placeholder="Email" autoComplete="username" style={input} />
        <input name="password" type="password" required placeholder="Password" autoComplete="current-password" style={input} />
        {sp.error && <p style={{ margin: 0, color: "#b3261e", fontSize: 13 }}>{ERR[sp.error] ?? ERR["1"]}</p>}
        <button type="submit" style={button}>Next</button>
        <a href="/login/reset" style={{ fontSize: 13, textAlign: "center", color: "#262967" }}>First time or forgot password?</a>
      </form>
    </main>
  );
}
