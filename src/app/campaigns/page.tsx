export const dynamic = "force-dynamic";
import Link from "next/link";
import { sql } from "@/lib/db";
import { byCampaign } from "@/lib/metrics";
import { NewCampaignButton } from "./new-button";

const nz = (n: number) => "$" + Math.round(n).toLocaleString("en-NZ");
const pct = (a: number, b: number) => (b ? ((100 * a) / b).toFixed(1) + "%" : "—");

export default async function CampaignsPage() {
  const drafts = await sql`select id, name, subject, status, scheduled_at, recipient_count, updated_at from campaigns where status in ('draft','scheduled','sending') order by updated_at desc`;
  const sent = await byCampaign(365);
  const tot = sent.reduce((a, c) => ({ sent: a.sent + c.sent, revenue: a.revenue + c.revenue, orders: a.orders + c.orders, opened: a.opened + c.opened, clicked: a.clicked + c.clicked }), { sent: 0, revenue: 0, orders: 0, opened: 0, clicked: 0 });
  const Tile = ({ l, v, s }: { l: string; v: string; s?: string }) => <div className="rounded-lg border border-black/10 bg-white p-4"><div className="text-xs uppercase tracking-wide text-black/50">{l}</div><div className="mt-1 text-2xl font-semibold tabular-nums">{v}</div>{s && <div className="text-xs text-black/50">{s}</div>}</div>;
  const Badge = ({ s }: { s: string }) => <span className={`rounded px-2 py-0.5 text-xs ${s === "sent" ? "bg-green-100 text-green-800" : s === "sending" ? "bg-amber-100 text-amber-800" : s === "scheduled" ? "bg-blue-100 text-blue-800" : "bg-black/5 text-black/60"}`}>{s}</span>;
  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-semibold">Campaigns</h1><NewCampaignButton /></div>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile l="Campaign revenue · 12 months" v={nz(tot.revenue)} s={`${tot.orders.toLocaleString()} orders from ${sent.length} campaigns`} />
        <Tile l="Revenue per recipient" v={tot.sent ? "$" + (tot.revenue / tot.sent).toFixed(2) : "—"} s={`${tot.sent.toLocaleString()} emails sent`} />
        <Tile l="Average open rate" v={pct(tot.opened, tot.sent)} />
        <Tile l="Average click rate" v={pct(tot.clicked, tot.sent)} />
      </div>
      {drafts.length > 0 && (
        <table className="mt-6 w-full border-separate border-spacing-0 overflow-hidden rounded-lg border border-black/10 bg-white text-sm">
          <thead className="bg-black/[.03] text-left text-xs uppercase tracking-wide text-black/50"><tr><th className="px-4 py-2">Campaign</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Scheduled</th><th className="px-4 py-2 text-right">Recipients</th></tr></thead>
          <tbody>{drafts.map(c => <tr key={c.id} className="border-t border-black/5"><td className="px-4 py-3"><Link href={`/campaigns/${c.id}`} className="font-medium hover:text-brand">{c.name}</Link><div className="text-xs text-black/50">{c.subject}</div></td><td className="px-4 py-3"><Badge s={c.status} /></td><td className="px-4 py-3 text-black/60">{c.scheduled_at ? new Date(c.scheduled_at).toLocaleString("en-NZ") : c.status === "draft" ? "—" : "now"}</td><td className="px-4 py-3 text-right tabular-nums">{c.recipient_count?.toLocaleString() ?? "—"}</td></tr>)}</tbody>
        </table>)}
      <h2 className="mt-10 text-lg font-semibold">Sent <span className="text-sm font-normal text-black/50">— last 12 months, including Klaviyo-era campaigns</span></h2>
      {sent.length === 0 ? <p className="mt-2 text-sm text-black/50">Nothing sent yet.</p> : (
        <table className="mt-3 w-full border-separate border-spacing-0 overflow-hidden rounded-lg border border-black/10 bg-white text-sm">
          <thead className="bg-black/[.03] text-left text-xs uppercase tracking-wide text-black/50"><tr><th className="px-4 py-2">Campaign</th><th className="px-4 py-2">Sent</th><th className="px-4 py-2 text-right">Recipients</th><th className="px-4 py-2 text-right">Open rate</th><th className="px-4 py-2 text-right">Click rate</th><th className="px-4 py-2 text-right">Orders</th><th className="px-4 py-2 text-right">Revenue</th><th className="px-4 py-2 text-right">Rev / recipient</th></tr></thead>
          <tbody>{sent.map(c => <tr key={c.id} className="border-t border-black/5"><td className="px-4 py-3"><Link href={`/campaigns/${c.id}`} className="font-medium hover:text-brand">{c.name}</Link>{c.source === "klaviyo" && <span className="ml-2 rounded bg-black/5 px-1.5 py-0.5 text-[10px] text-black/50">Klaviyo</span>}<div className="text-xs text-black/50">{c.subject}</div></td><td className="px-4 py-3 text-black/60">{c.sent_at ? new Date(c.sent_at).toLocaleDateString("en-NZ") : "—"}</td><td className="px-4 py-3 text-right tabular-nums">{c.sent.toLocaleString()}</td><td className="px-4 py-3 text-right tabular-nums">{pct(c.opened, c.sent)}</td><td className="px-4 py-3 text-right tabular-nums">{pct(c.clicked, c.sent)}</td><td className="px-4 py-3 text-right tabular-nums">{c.orders}</td><td className="px-4 py-3 text-right tabular-nums font-medium">{nz(c.revenue)}</td><td className="px-4 py-3 text-right tabular-nums text-black/60">{c.sent ? "$" + (c.revenue / c.sent).toFixed(2) : "—"}</td></tr>)}</tbody>
        </table>)}
    </div>
  );
}
