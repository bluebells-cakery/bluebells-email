import { sql } from "@/lib/db";
import { sendEmail } from "@/lib/ses";

/** Emails the owner(s) about something security-relevant. At most once every 6 hours per subject. */
export async function securityAlert(subject: string, body: string) {
  const key = "alert:" + subject.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60);
  const fresh = await sql`insert into sync_state(key, value) values (${key}, ${body}) on conflict (key) do update set value = excluded.value, updated_at = now() where sync_state.updated_at < now() - interval '6 hours' returning key`;
  if (!fresh.length) return;
  const owners = await sql`select email from users where role = 'owner'`;
  for (const o of owners) {
    try { await sendEmail({ to: o.email, subject: `[Bluebells EDM security] ${subject}`, html: `<p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5">${body}</p><p style="font-family:Arial,sans-serif;font-size:13px;color:#666">Sent automatically by Bluebells EDM.</p>`, text: body, fromName: "Bluebells EDM" }); }
    catch (e) { console.error("securityAlert", (e as Error).message); }
  }
}
