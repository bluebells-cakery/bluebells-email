export const dynamic = "force-dynamic";
import Link from "next/link";
import { overview, byFlow, byCampaign, daily, attributeOrders, type Period } from "@/lib/metrics";

const nz = (n: number) => "$" + Math.round(n).toLocaleString("en-NZ");
const pct = (a: number, b: number) => (b ? ((100 * a) / b).toFixed(1) + "%" : "—");

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const { d } = await searchParams; const days = ([7, 30, 90, 365].includes(Number(d)) ? Number(d) : 30) as Period;
  await attributeOrders();
  const [m, flows, campaigns, series] = await Promise.all([overview(days), byFlow(days), byCampaign(days), daily(days)]);
  const maxRev = Math.max(1, ...series.map(s => Number(s.total_revenue)));
  const Tile = ({ l, v, s }: { l: string; v: string; s?: string }) => <div className="rounded-lg border border-black/10 bg-white p-4"><div className="text-xs uppercase tracking-wide text-black/50">{l}</div><div className="mt-1 text-2xl font-semibold tabular-nums">{v}</div>{s && <div className="text-xs text-black/50">{s}</div>}</div>;
  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="flex gap-1 rounded-md border border-black/10 bg-white p-0.5 text-sm">{([7, 30, 90, 365] as Period[]).map(p => <Link key={p} href={`/dashboard?d=${p}`} className={`rounded px-3 py-1 ${p === days ? "bg-brand text-white" : "text-black/60 hover:bg-black/5"}`}>{p === 365 ? "12 months" : `${p} days`}</Link>)}</div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile l="Email-attributed revenue" v={nz(m.attributed_revenue)} s={`${m.attributed_orders} orders · ${pct(m.attributed_revenue, m.total_revenue)} of ${nz(m.total_revenue)}`} />
        <Tile l="Emails sent" v={m.sent.toLocaleString()} s={`${m.delivered.toLocaleString()} delivered`} />
        <Tile l="Open rate" v={pct(m.opened, m.sent)} s={`${m.opened.toLocaleString()} unique opens`} />
        <Tile l="Click rate" v={pct(m.clicked, m.sent)} s={`${m.clicked.toLocaleString()} unique clicks`} />
        <Tile l="Subscribers" v={m.subscribers.toLocaleString()} s={`+${m.new_subscribers.toLocaleString()} new`} />
        <Tile l="Unsubscribes" v={m.unsubscribes.toLocaleString()} s={pct(m.unsubscribes, m.sent)} />
        <Tile l="Bounces" v={m.bounced.toLocaleString()} s={pct(m.bounced, m.sent)} />
        <Tile l="Spam complaints" v={m.complaints.toLocaleString()} s={`${pct(m.complaints, m.sent)} · keep under 0.1%`} />
      </div>

      <div className="mt-8 rounded-lg border border-black/10 bg-white p-4">
        <div className="mb-2 flex items-baseline gap-4 text-sm"><span className="font-medium">Revenue per day</span><span className="flex items-center gap-1 text-xs text-black/50"><i className="inline-block h-2 w-3 bg-black/15" /> all orders</span><span className="flex items-center gap-1 text-xs text-black/50"><i className="inline-block h-2 w-3 bg-brand" /> email-attributed</span></div>
        <svg viewBox={`0 0 ${series.length * 10} 120`} preserveAspectRatio="none" className="h-40 w-full">
          {series.map((s, i) => { const t = (Number(s.total_revenue) / maxRev) * 110, a = (Number(s.revenue) / maxRev) * 110; return (<g key={s.day}><rect x={i * 10 + 1} y={115 - t} width={8} height={t} fill="rgba(0,0,0,.12)"><title>{s.day}: {nz(Number(s.total_revenue))} total</title></rect><rect x={i * 10 + 1} y={115 - a} width={8} height={a} fill="#3b5bdb"><title>{s.day}: {nz(Number(s.revenue))} attributed</title></rect></g>); })}
        </svg>
        <div className="flex justify-between text-[10px] text-black/40"><span>{series[0]?.day}</span><span>{series[series.length - 1]?.day}</span></div>
      </div>

      <h2 className="mt-10 text-lg font-semibold">Flows</h2>
      <table className="mt-3 w-full border-separate border-spacing-0 overflow-hidden rounded-lg border border-black/10 bg-white text-sm">
        <thead className="bg-black/[.03] text-left text-xs uppercase tracking-wide text-black/50"><tr><th className="px-4 py-2">Flow</th><th className="px-4 py-2 text-right">Sent</th><th className="px-4 py-2 text-right">Open</th><th className="px-4 py-2 text-right">Click</th><th className="px-4 py-2 text-right">Orders</th><th className="px-4 py-2 text-right">Revenue</th><th className="px-4 py-2 text-right">Rev / recipient</th></tr></thead>
        <tbody>{flows.map(f => <tr key={f.id} className="border-t border-black/5"><td className="px-4 py-2"><Link href={`/flows/${f.id}`} className="hover:text-brand">{f.name}</Link> <span className="text-xs text-black/40">{f.status}</span></td><td className="px-4 py-2 text-right tabular-nums">{f.sent.toLocaleString()}</td><td className="px-4 py-2 text-right tabular-nums">{pct(f.opened, f.sent)}</td><td className="px-4 py-2 text-right tabular-nums">{pct(f.clicked, f.sent)}</td><td className="px-4 py-2 text-right tabular-nums">{f.orders}</td><td className="px-4 py-2 text-right tabular-nums">{nz(f.revenue)}</td><td className="px-4 py-2 text-right tabular-nums">{f.sent ? "$" + (f.revenue / f.sent).toFixed(2) : "—"}</td></tr>)}</tbody>
      </table>

      <h2 className="mt-10 text-lg font-semibold">Campaigns</h2>
      {campaigns.length === 0 ? <p className="mt-2 text-sm text-black/50">No campaigns sent yet.</p> : (
        <table className="mt-3 w-full border-separate border-spacing-0 overflow-hidden rounded-lg border border-black/10 bg-white text-sm">
          <thead className="bg-black/[.03] text-left text-xs uppercase tracking-wide text-black/50"><tr><th className="px-4 py-2">Campaign</th><th className="px-4 py-2">Sent</th><th className="px-4 py-2 text-right">Recipients</th><th className="px-4 py-2 text-right">Open</th><th className="px-4 py-2 text-right">Click</th><th className="px-4 py-2 text-right">Orders</th><th className="px-4 py-2 text-right">Revenue</th></tr></thead>
          <tbody>{campaigns.map(c => <tr key={c.id} className="border-t border-black/5"><td className="px-4 py-2">{c.name}<div className="text-xs text-black/50">{c.subject}</div></td><td className="px-4 py-2 text-black/60">{c.sent_at ? new Date(c.sent_at).toLocaleDateString("en-NZ") : "—"}</td><td className="px-4 py-2 text-right tabular-nums">{c.sent.toLocaleString()}</td><td className="px-4 py-2 text-right tabular-nums">{pct(c.opened, c.sent)}</td><td className="px-4 py-2 text-right tabular-nums">{pct(c.clicked, c.sent)}</td><td className="px-4 py-2 text-right tabular-nums">{c.orders}</td><td className="px-4 py-2 text-right tabular-nums">{nz(c.revenue)}</td></tr>)}</tbody>
        </table>)}
      <p className="mt-4 text-xs text-black/50">Attribution matches Klaviyo's setting: an order counts for the last email the customer clicked in the 5 days before ordering. Opens exclude nothing yet (Apple Mail Privacy inflates opens everywhere; clicks are the honest number).</p>
    </div>
  );
}
