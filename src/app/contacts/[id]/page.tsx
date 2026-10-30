export const dynamic = "force-dynamic";
import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { ProfileActions } from "./actions";

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [c] = await sql`select * from contacts where id = ${id}`; if (!c) notFound();
  const orders = await sql`select shopify_order_id, total, placed_at, attributed_send_id from orders where contact_id = ${id} order by placed_at desc limit 20`;
  const sends = await sql`select q.id, q.subject, q.status, q.sent_at, q.created_at, f.name as flow, ca.name as campaign,
      (select count(*)::int from events e where e.send_id = q.id and e.type='open') opens, (select count(*)::int from events e where e.send_id = q.id and e.type='click') clicks
    from send_queue q left join flows f on f.id = q.flow_id left join campaigns ca on ca.id = q.campaign_id where q.contact_id = ${id} order by q.created_at desc limit 30`;
  const runs = await sql`select r.status, r.next_at, r.created_at, f.name from flow_runs r join flows f on f.id = r.flow_id where r.contact_id = ${id} order by r.created_at desc limit 10`;
  const events = await sql`select type, occurred_at, url, meta from events where contact_id = ${id} and send_id is null order by occurred_at desc limit 30`;
  const sup = (await sql`select reason, source, created_at from suppressions where email = ${c.email}`)[0];
  const Row = ({ l, v }: { l: string; v: React.ReactNode }) => <div className="flex gap-3 py-1 text-sm"><div className="w-36 shrink-0 text-black/50">{l}</div><div>{v}</div></div>;
  const d = (x: unknown) => x ? new Date(String(x)).toLocaleString("en-NZ") : "—";
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Link href="/contacts" className="text-sm text-black/50 hover:text-black">← Contacts</Link>
      <div className="mt-2 flex items-center gap-3"><h1 className="text-2xl font-semibold">{[c.first_name, c.last_name].filter(Boolean).join(" ") || c.email}</h1><span className={`rounded px-2 py-0.5 text-xs ${c.status === "subscribed" ? "bg-green-100 text-green-800" : "bg-black/5 text-black/60"}`}>{String(c.status).replace("_", " ")}</span></div>
      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <section className="rounded-lg border border-black/10 bg-white p-5">
            <Row l="Email" v={c.email} /><Row l="City" v={c.city ?? "—"} /><Row l="Consent" v={c.status === "subscribed" ? `${c.consent_source ?? "unknown source"} · ${d(c.consent_at)}` : c.status === "unsubscribed" ? `unsubscribed ${d(c.unsubscribed_at)}` : c.status === "suppressed" ? `suppressed · ${sup?.reason ?? c.suppressed_reason ?? ""} (${sup?.source ?? ""}) ${d(sup?.created_at)}` : "never subscribed"} />
            <Row l="Orders" v={`${c.order_count} · $${Math.round(Number(c.total_spent)).toLocaleString()} · last ${d(c.last_order_at)}`} /><Row l="Last open / click" v={`${d(c.last_open_at)} / ${d(c.last_click_at)}`} /><Row l="Tags" v={(c.tags as string[]).join(", ") || "—"} /><Row l="Profile created" v={d(c.created_at)} />
            <Row l="IDs" v={<span className="font-mono text-xs text-black/50">shopify {c.shopify_customer_id ?? "—"} · klaviyo {c.klaviyo_profile_id ?? "—"}</span>} />
          </section>
          <section className="rounded-lg border border-black/10 bg-white p-5"><h2 className="mb-2 font-medium">Emails</h2>
            {sends.length === 0 ? <p className="text-sm text-black/50">None yet.</p> : <table className="w-full text-sm"><tbody>{sends.map(s => <tr key={s.id} className="border-t border-black/5"><td className="py-1.5">{s.subject}<div className="text-xs text-black/50">{s.flow ?? s.campaign}</div></td><td className="py-1.5 text-xs text-black/60">{s.status} {d(s.sent_at ?? s.created_at)}</td><td className="py-1.5 text-right text-xs text-black/60">{s.opens ? "opened" : ""} {s.clicks ? "· clicked" : ""}</td></tr>)}</tbody></table>}
          </section>
          <section className="rounded-lg border border-black/10 bg-white p-5"><h2 className="mb-2 font-medium">Orders</h2>
            {orders.length === 0 ? <p className="text-sm text-black/50">None.</p> : <table className="w-full text-sm"><tbody>{orders.map(o => <tr key={o.shopify_order_id} className="border-t border-black/5"><td className="py-1.5">#{o.shopify_order_id}</td><td className="py-1.5 text-black/60">{d(o.placed_at)}</td><td className="py-1.5 text-right tabular-nums">${Number(o.total).toFixed(2)}</td><td className="py-1.5 text-right text-xs text-black/50">{o.attributed_send_id ? "email-attributed" : ""}</td></tr>)}</tbody></table>}
          </section>
          {(runs.length > 0 || events.length > 0) && <section className="rounded-lg border border-black/10 bg-white p-5"><h2 className="mb-2 font-medium">Activity</h2>
            <ul className="space-y-1 text-sm">{runs.map((r, i) => <li key={"r" + i} className="text-black/70">Flow “{r.name}” — {r.status}{r.status === "active" && `, next step ${d(r.next_at)}`} <span className="text-xs text-black/40">{d(r.created_at)}</span></li>)}
            {events.map((e, i) => <li key={"e" + i} className="text-black/70">{e.type}{e.url ? ` → ${String(e.url).slice(0, 60)}` : ""} <span className="text-xs text-black/40">{d(e.occurred_at)}</span></li>)}</ul></section>}
        </div>
        <ProfileActions id={Number(c.id)} status={String(c.status)} email={String(c.email)} />
      </div>
    </div>
  );
}
