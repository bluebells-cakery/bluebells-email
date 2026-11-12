import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { UsersPanel } from "./panel";
export const dynamic = "force-dynamic";

export default async function Users() {
  const me = await currentUser();
  if (!me) redirect("/login");
  const users = me.role === "owner" ? await sql`select id, email, name, role, totp_enabled, last_login_at from users order by role, email` : [];
  const cap = Number(process.env.EDM_DAILY_SEND_CAP ?? 6000);
  const [s] = await sql`select count(*)::int n from send_queue where status = 'sent' and sent_at > now() - interval '24 hours'`;
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Users &amp; security</h1>
      <p className="mt-1 text-sm text-black/60">Logged in as {me.email} ({me.role}).</p>
      <form method="post" action="/api/logout" className="mt-2"><button className="rounded-md border border-black/15 px-3 py-1.5 text-sm">Log out</button></form>
      <div className="mt-6 rounded-lg border border-black/10 bg-white p-5 text-sm">
        <h2 className="font-medium">Sending safeguards</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-black/70">
          <li>Everyone logs in with their own password and a phone code.</li>
          <li>Only an owner can send or schedule a campaign. Changing the email or audience after that blocks the send.</li>
          <li>Daily cap: {s.n.toLocaleString()} of {cap.toLocaleString()} emails used in the last 24 hours. Sending stops at the cap and you get an alert email.</li>
          <li>Emails added to the queue from outside the app are refused.</li>
        </ul>
      </div>
      {me.role === "owner" ? <UsersPanel me={me.id} users={JSON.parse(JSON.stringify(users))} /> : <p className="mt-6 text-sm text-black/60">Only an owner can add or remove logins.</p>}
    </div>
  );
}
