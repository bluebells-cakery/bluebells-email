export const dynamic = "force-dynamic";
import Link from "next/link";
import { sql } from "@/lib/db";
import { renderTemplate } from "@/lib/render";
import { ReviewSettings, TestSend, SkipButton } from "./controls";

const TEMPLATE_ID = 53;
const nzDate = (d: string | Date) => new Date(d).toLocaleString("en-NZ", { timeZone: "Pacific/Auckland", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export default async function ReviewsPage() {
  const [flow] = await sql`select id, definition from flows where name = 'Post Purchase'`;
  const steps = (flow?.definition?.steps ?? []) as { id: string; waitUntil?: { days: number; time: string }; email?: { enabled?: boolean } }[];
  const wait = steps.find(s => s.id === "rr-wait")?.waitUntil ?? { days: 7, time: "10:00" };
  const enabled = steps.find(s => s.id === "rr-email")?.email?.enabled !== false;

  const [stats] = await sql`select
      count(distinct q.id) filter (where q.status = 'sent')::int sent,
      count(distinct q.id) filter (where q.status = 'sent' and q.sent_at > now() - interval '30 days')::int sent30,
      count(distinct e.contact_id) filter (where e.type = 'open')::int openers,
      count(distinct e.contact_id) filter (where e.type = 'click' and e.url ilike '%jm_review%')::int review_clickers
    from send_queue q left join events e on e.send_id = q.id where q.step_id = 'rr-email'`;
  const [pending] = await sql`select count(*)::int n, min(next_at) next from flow_runs where flow_id = ${flow?.id ?? 0} and status = 'active' and step_id = 'rr-email'`;
  const upcoming = await sql`select r.id, r.next_at, r.context->'order'->>'name' order_name, jsonb_array_length(coalesce(r.context->'order'->'line_items','[]'::jsonb))::int items,
      r.context->'order'->>'fulfil_date' fulfil_date, c.first_name, c.email
    from flow_runs r join contacts c on c.id = r.contact_id
    where r.flow_id = ${flow?.id ?? 0} and r.status = 'active' and r.step_id = 'rr-email' order by r.next_at limit 30`;
  const recent = await sql`select q.sent_at, c.first_name, c.email,
      exists(select 1 from events e where e.send_id = q.id and e.type = 'open') opened,
      exists(select 1 from events e where e.send_id = q.id and e.type = 'click' and e.url ilike '%jm_review%') clicked
    from send_queue q join contacts c on c.id = q.contact_id where q.step_id = 'rr-email' and q.status = 'sent' order by q.sent_at desc limit 15`;

  const [t] = await sql`select html, subject, updated_at from templates where id = ${TEMPLATE_ID}`;
  const [sample] = await sql`select context from flow_runs where flow_id = ${flow?.id ?? 0} and step_id = 'rr-email' and jsonb_array_length(coalesce(context->'order'->'line_items','[]'::jsonb)) >= 1 order by next_at limit 1`;
  const preview = t?.html ? renderTemplate(t.html, { first_name: "Ryan", email: "preview@example.com", token: "preview", unsubscribe_url: "#", order: sample?.context?.order }) : "";
  const [te] = await sql`select value from settings where key = 'test_emails'`;
  const testTo = String(te?.value ?? "ryan@bluebellscakery.co.nz").split(/[,\s]+/)[0];

  const provider = (process.env.EMAIL_PROVIDER ?? "ses") === "resend" ? "Resend" : "Amazon SES";
  const Card = ({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) => (
    <section className="rounded-lg border border-black/10 bg-white p-5"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="font-semibold">{title}</h2>{right}</div>{children}</section>);
  const Stat = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
    <div className="rounded-lg border border-black/10 bg-white p-4"><div className="text-xs uppercase tracking-wide text-black/50">{label}</div><div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>{sub && <div className="text-xs text-black/50">{sub}</div>}</div>);
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) + "%" : "—");

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-semibold">Reviews</h1>
        <span className={`rounded px-2 py-0.5 text-xs ${enabled ? "bg-green-100 text-green-800" : "bg-black/5 text-black/60"}`}>{enabled ? "Review requests live" : "Review requests paused"}</span></div>
      <p className="mt-1 text-sm text-black/60">We send the review request emails. Judge.me stores the reviews and shows the stars on the website and Google.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Sent" value={stats.sent} sub={`${stats.sent30} in last 30 days`} />
        <Stat label="Opened" value={pct(stats.openers, stats.sent)} sub={`${stats.openers} people`} />
        <Stat label="Clicked to review" value={pct(stats.review_clickers, stats.sent)} sub={`${stats.review_clickers} people`} />
        <Stat label="Scheduled" value={pending.n} sub={pending.next ? `next ${nzDate(pending.next)}` : "none queued"} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <Card title="Settings"><ReviewSettings enabled={enabled} days={wait.days} time={wait.time} /></Card>

          <Card title={`Scheduled (${pending.n})`}>
            {upcoming.length === 0 ? <p className="text-sm text-black/50">Nothing scheduled.</p> :
            <table className="w-full text-sm"><thead className="text-left text-xs uppercase tracking-wide text-black/50"><tr><th className="py-1">Sends</th><th>Customer</th><th>Order</th><th>Delivered / picked up</th><th className="text-right">Products</th><th /></tr></thead>
              <tbody>{upcoming.map(u => <tr key={u.id} className="border-t border-black/5"><td className="py-2 whitespace-nowrap">{nzDate(u.next_at)}</td><td>{u.first_name ?? ""} <span className="text-black/40">{u.email}</span></td><td>{u.order_name ?? "—"}</td><td>{u.fulfil_date ?? "—"}</td><td className="text-right tabular-nums">{u.items}</td><td className="text-right"><SkipButton runId={Number(u.id)} /></td></tr>)}</tbody></table>}
            {pending.n > upcoming.length && <p className="mt-2 text-xs text-black/40">Showing the next {upcoming.length} of {pending.n}.</p>}
          </Card>

          <Card title="Recently sent">
            {recent.length === 0 ? <p className="text-sm text-black/50">None yet.</p> :
            <table className="w-full text-sm"><thead className="text-left text-xs uppercase tracking-wide text-black/50"><tr><th className="py-1">Sent</th><th>Customer</th><th>Opened</th><th>Clicked review</th></tr></thead>
              <tbody>{recent.map((r, i) => <tr key={i} className="border-t border-black/5"><td className="py-2 whitespace-nowrap">{nzDate(r.sent_at)}</td><td>{r.first_name ?? ""} <span className="text-black/40">{r.email}</span></td><td>{r.opened ? "✓" : ""}</td><td>{r.clicked ? "✓" : ""}</td></tr>)}</tbody></table>}
          </Card>

          <Card title="Judge.me">
            <ul className="space-y-1 text-sm">
              <li>Judge.me's own review emails: <strong>off</strong> (we send them instead)</li>
              <li>Stores reviews, photos, star widgets and the Google Shopping feed</li>
            </ul>
            <a href="https://admin.shopify.com/store/bluebells-cakery/apps/judgeme" target="_blank" className="mt-3 inline-block text-sm text-brand hover:underline">Open Judge.me (moderate reviews) ↗</a>
          </Card>

          <Card title="Sending">
            <dl className="grid grid-cols-[140px_1fr] gap-y-1 text-sm"><dt className="text-black/50">Provider</dt><dd>{provider}</dd><dt className="text-black/50">From</dt><dd>Bluebells Cakery &lt;{process.env.SES_FROM_EMAIL}&gt;</dd><dt className="text-black/50">Replies go to</dt><dd>orders@bluebellscakery.co.nz</dd><dt className="text-black/50">Smart sending</dt><dd>Held if the customer got another email in the last 16 h</dd></dl>
          </Card>
        </div>

        <Card title="Email" right={<span className="flex gap-2"><TestSend templateId={TEMPLATE_ID} to={testTo} /><Link href={`/templates/${TEMPLATE_ID}`} className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white">Edit email</Link></span>}>
          <div className="mb-2 text-xs text-black/50">Subject: {String(t?.subject ?? "").replace(/\{\{\s*person\.first_name[^}]*\}\}/, "Ryan")}</div>
          <iframe srcDoc={preview} title="Review request preview" className="h-[900px] w-full rounded border border-black/10" />
        </Card>
      </div>
    </div>
  );
}
