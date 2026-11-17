import { card, wrap, input, button } from "./styles";
const ERR: Record<string, string> = { locked: "Too many wrong codes — locked for 15 minutes.", send: "Couldn't send the code just now. Try again in a minute." };

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const sp = await searchParams;
  return (
    <main style={wrap}>
      <form method="post" action="/api/login" style={card}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 500 }}>Bluebells EDM</h1>
        <p style={{ margin: 0, fontSize: 14, opacity: .75 }}>Enter your work email and we&apos;ll email you a login code.</p>
        <input type="hidden" name="next" value={sp.next || "/dashboard"} />
        <input name="email" type="email" autoFocus required placeholder="you@bluebellscakery.co.nz" autoComplete="username" style={input} />
        {sp.error && <p style={{ margin: 0, color: "#b3261e", fontSize: 13 }}>{ERR[sp.error] ?? "Something went wrong — try again."}</p>}
        <button type="submit" style={button}>Email me a code</button>
      </form>
    </main>
  );
}
