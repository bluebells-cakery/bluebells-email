import { card, wrap, input, button } from "../styles";
export default async function Reset({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const sp = await searchParams;
  return (
    <main style={wrap}>
      <form method="post" action="/api/login/reset" style={card}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 500 }}>Set your password</h1>
        <p style={{ margin: 0, fontSize: 14, opacity: .75 }}>Enter your work email. We&apos;ll email you a code so you can choose a password.</p>
        <input name="email" type="email" defaultValue={sp.e || ""} autoFocus required placeholder="you@bluebellscakery.co.nz" autoComplete="username" style={input} />
        <button type="submit" style={button}>Email me a code</button>
        <a href="/login" style={{ fontSize: 13, textAlign: "center", color: "#262967" }}>Back to login</a>
      </form>
    </main>
  );
}
