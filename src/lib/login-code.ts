import { randomInt, createHash } from "node:crypto";
import { sql } from "@/lib/db";
import { sendEmail } from "@/lib/ses";

export const codeHash = (s: string) => createHash("sha256").update((process.env.EDM_SESSION_SECRET ?? "") + ":" + s).digest("hex");

/** Emails a fresh 6-digit code (valid 10 min). Skips if one went out in the last 30s. */
export async function emailLoginCode(u: { id: number; email: string; login_code_sent_at?: string | Date | null }, purpose: "login" | "reset") {
  if (u.login_code_sent_at && Date.now() - new Date(u.login_code_sent_at).getTime() < 30_000) return;
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await sql`update users set login_code_hash = ${codeHash(code)}, login_code_expires = now() + interval '10 minutes', login_code_sent_at = now() where id = ${u.id}`;
  const what = purpose === "reset" ? "set your Bluebells EDM password" : "log in to Bluebells EDM";
  const html = `<div style="font-family:Arial,sans-serif;color:#262967;font-size:15px;line-height:1.5"><p>Your code to ${what}:</p><p style="font-size:32px;letter-spacing:6px;font-weight:bold;margin:12px 0">${code}</p><p style="color:#666;font-size:13px">It works once, for 10 minutes. If this wasn't you, ignore this email${purpose === "login" ? " and change your password" : ""}.</p></div>`;
  await sendEmail({ to: u.email, subject: `Bluebells EDM code: ${code}`, html, text: `Your code to ${what}: ${code}\nIt works once, for 10 minutes.`, fromName: "Bluebells EDM" });
}
