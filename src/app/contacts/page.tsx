export const dynamic = "force-dynamic";
import { sql } from "@/lib/db";
import { translate } from "@/lib/rules";
import { ProfileSearch } from "./search";

export default async function ContactsPage() {
  const [counts] = await sql`select count(*) filter (where status='subscribed')::int subscribed,
      count(*) filter (where status='subscribed' and consent_at > now() - interval '7 days')::int new7,
      count(*) filter (where status='subscribed' and consent_at > now() - interval '30 days')::int new30,
      count(*) filter (where unsubscribed_at > now() - interval '7 days')::int unsub7,
      count(*) filter (where unsubscribed_at > now() - interval '30 days')::int unsub30,
      count(*) filter (where status='subscribed' and (last_open_at > now() - interval '30 days' or last_click_at > now() - interval '30 days'))::int engaged30,
      count(*) filter (where status='subscribed' and order_count > 0)::int buyers,
      count(*) filter (where status='unsubscribed')::int unsubscribed, count(*) filter (where status='suppressed')::int suppressed, count(*)::int total from contacts`;
  const segs = await sql`select id, name, description, definition, is_active, klaviyo_count, source from segments order by sort_order, name`;
  const rows: { id: number; name: string; description: string | null; klaviyo_count: number | null; words: string; ours: number | null; supported: boolean; unsupported: string[] }[] = [];
  for (const s of segs) {
    const t = translate(s.definition);
    let ours: number | null = null;
    if (t.sql) { try { ours = Number((await sql.query(`select count(*)::int n from contacts c where ${t.sql}`))[0].n); } catch { ours = null; } }
    rows.push({ id: s.id, name: s.name, description: s.description, klaviyo_count: s.klaviyo_count, words: t.words, ours, supported: t.supported, unsupported: t.unsupported });
  }
  const Stat = ({ l, v, s }: { l: string; v: number; s?: string }) => <div className="rounded-lg border border-black/10 bg-white p-4"><div className="text-2xl font-semibold tabular-nums">{v.toLocaleString()}</div><div className="text-xs uppercase tracking-wide text-black/50">{l}</div>{s && <div className="mt-1 text-xs text-black/50">{s}</div>}</div>;
  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Contacts</h1>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat l="Subscribers" v={counts.subscribed} s={`${Math.round(100 * counts.engaged30 / Math.max(1, counts.subscribed))}% engaged in last 30 days`} />
        <Stat l="New this week" v={counts.new7} s={`${counts.new30.toLocaleString()} in the last 30 days`} />
        <Stat l="Unsubscribed this week" v={counts.unsub7} s={`${counts.unsub30.toLocaleString()} in the last 30 days`} />
        <Stat l="Subscribers who've ordered" v={counts.buyers} s={`${Math.round(100 * counts.buyers / Math.max(1, counts.subscribed))}% of subscribers`} />
      </div>
      <p className="mt-2 text-xs text-black/50">{counts.total.toLocaleString()} profiles in total · {counts.unsubscribed.toLocaleString()} unsubscribed · {counts.suppressed.toLocaleString()} suppressed (bounces, complaints, Klaviyo suppressions)</p>
      <ProfileSearch />
      <h2 className="mt-10 text-lg font-semibold">Segments <span className="text-sm font-normal text-black/50">— Klaviyo definitions, evaluated on our data</span></h2>
      <table className="mt-4 w-full border-separate border-spacing-0 overflow-hidden rounded-lg border border-black/10 bg-white text-sm">
        <thead className="bg-black/[.03] text-left text-xs uppercase tracking-wide text-black/50"><tr><th className="px-4 py-2">Segment</th><th className="px-4 py-2">Exact rules</th><th className="px-4 py-2 text-right">Klaviyo</th><th className="px-4 py-2 text-right">Ours</th></tr></thead>
        <tbody>
          {rows.map(s => (
            <tr key={s.id} className="border-t border-black/5 align-top">
              <td className="px-4 py-3"><div className="font-medium">{s.name}</div><div className="text-xs text-black/50">{s.description}</div></td>
              <td className="px-4 py-3 whitespace-pre-line text-xs text-black/70">{s.words}{!s.supported && <div className="mt-1 text-amber-700">Not yet evaluable here: {s.unsupported.join("; ")}</div>}</td>
              <td className="px-4 py-3 text-right tabular-nums">{s.klaviyo_count?.toLocaleString() ?? "—"}</td>
              <td className="px-4 py-3 text-right tabular-nums">{s.ours?.toLocaleString() ?? <span className="text-black/40">—</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-black/50">Engagement-based segments need the Klaviyo open/click history, which is importing now — counts will converge as it lands. Differences also come from Klaviyo counting “Received Email” (we only have 180 days of history).</p>
    </div>
  );
}
