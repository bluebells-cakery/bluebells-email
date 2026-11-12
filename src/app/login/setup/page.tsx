import QRCode from "qrcode";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { newTotpSecret, totpUri } from "@/lib/auth";
import { card, wrap, input, button } from "../styles";
export const dynamic = "force-dynamic";
const ERR: Record<string, string> = { short: "Password needs at least 10 characters.", match: "The two passwords don't match.", code: "That code isn't right — try the newest one from the app." };

export default async function Setup({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const sp = await searchParams;
  const [u] = sp.token ? await sql`select id, email, totp_secret from users where setup_token = ${sp.token} and setup_expires > now()` : [];
  if (!u) redirect("/login?error=expired");
  let secret = u.totp_secret as string | null;
  if (!secret) { secret = newTotpSecret(); await sql`update users set totp_secret = ${secret} where id = ${u.id}`; }
  const qr = await QRCode.toDataURL(totpUri(u.email, secret), { margin: 1, width: 220 });
  return (
    <main style={wrap}>
      <form method="post" action="/api/login/setup" style={{ ...card, width: 400 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 500 }}>Set up your login</h1>
        <p style={{ margin: 0, fontSize: 14, opacity: .75 }}>{u.email}</p>
        <input type="hidden" name="token" value={sp.token} />
        <b style={{ fontSize: 14 }}>1. Choose a password (10+ characters)</b>
        <input name="password" type="password" required minLength={10} placeholder="New password" autoComplete="new-password" style={input} />
        <input name="password2" type="password" required minLength={10} placeholder="Same password again" autoComplete="new-password" style={input} />
        <b style={{ fontSize: 14 }}>2. Scan this with an authenticator app on your phone</b>
        <p style={{ margin: 0, fontSize: 13, opacity: .75 }}>Google Authenticator, Microsoft Authenticator or 1Password all work.</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} alt="QR code" width={220} height={220} style={{ justifySelf: "center", borderRadius: 8 }} />
        <p style={{ margin: 0, fontSize: 12, opacity: .7, wordBreak: "break-all", textAlign: "center" }}>Can&apos;t scan? Type this key: {secret}</p>
        <b style={{ fontSize: 14 }}>3. Enter the 6-digit code the app shows</b>
        <input name="code" inputMode="numeric" autoComplete="one-time-code" required placeholder="123 456" style={{ ...input, letterSpacing: 4, textAlign: "center", fontSize: 20 }} />
        {sp.error && <p style={{ margin: 0, color: "#b3261e", fontSize: 13 }}>{ERR[sp.error] ?? "Something went wrong — try again."}</p>}
        <button type="submit" style={button}>Finish</button>
      </form>
    </main>
  );
}
