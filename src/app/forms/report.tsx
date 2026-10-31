import { sql } from "@/lib/db";
const nz = (n: number) => "$" + Math.round(n).toLocaleString("en-NZ");
const pct = (a: number, b: number) => (b ? ((100 * a) / b).toFixed(2) + "%" : "—");

export async function FormReport({ formId, days }: { formId?: number; days: number }) {
  const iv = `${days} days`;
  const [t] = await sql`select count(*) filter (where type='view')::int views, count(*) filter (where type='submit')::int submits,
      count(distinct email) filter (where type='submit' and (meta->>'created')::boolean)::int new_profiles
    from form_events where (${formId ?? null}::bigint is null or form_id = ${formId ?? null}) and occurred_at > now() - ${iv}::interval`;
  const [rev] = await sql`select coalesce(sum(o.total),0)::float revenue, count(distinct o.id)::int orders from form_events fe join contacts c on c.email = fe.email join orders o on o.contact_id = c.id and o.placed_at >= fe.occurred_at
    where fe.type='submit' and (${formId ?? null}::bigint is null or fe.form_id = ${formId ?? null}) and fe.occurred_at > now() - ${iv}::interval`;
  const series = await sql`with d as (select generate_series(date_trunc('day', now() - ${iv}::interval), date_trunc('day', now()), '1 day') day)
    select to_char(d.day,'DD Mon') day, (select count(*)::int from form_events e where e.type='view' and (${formId ?? null}::bigint is null or e.form_id = ${formId ?? null}) and date_trunc('day', e.occurred_at) = d.day) views,
      (select count(*)::int from form_events e where e.type='submit' and (${formId ?? null}::bigint is null or e.form_id = ${formId ?? null}) and date_trunc('day', e.occurred_at) = d.day) submits from d order by d.day`;
  const pages = await sql`select meta->>'page' page, count(*) filter (where type='view')::int views, count(*) filter (where type='submit')::int submits from form_events
    where (${formId ?? null}::bigint is null or form_id = ${formId ?? null}) and occurred_at > now() - ${iv}::interval and meta->>'page' is not null group by 1 order by 2 desc limit 8`;
  const maxV = Math.max(1, ...series.map(s => s.views));
  const Tile = ({ l, v, s }: { l: string; v: string; s?: string }) => <div className="rounded-lg border border-black/10 bg-white p-4"><div className="text-xs uppercase tracking-wide text-black/50">{l}</div><div className="mt-1 text-2xl font-semibold tabular-nums">{v}</div>{s && <div className="text-xs text-black/50">{s}</div>}</div>;
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile l="Viewed form" v={t.views.toLocaleString()} />
        <Tile l="Submits" v={t.submits.toLocaleString()} s={`${t.new_profiles.toLocaleString()} brand-new profiles`} />
        <Tile l="Submit rate" v={pct(t.submits, t.views)} s={t.views > 100 ? (t.submits / t.views > 0.05 ? "Excellent (industry avg ~3%)" : t.submits / t.views > 0.03 ? "Good" : "Below average — try a stronger offer") : "needs more views"} />
        <Tile l="Revenue from signups" v={nz(rev.revenue)} s={`${rev.orders} orders placed after signing up`} />
      </div>
      <div className="mt-4 rounded-lg border border-black/10 bg-white p-4">
        <div className="mb-2 flex items-baseline gap-4 text-sm"><span className="font-medium">Views vs signups per day</span><span className="flex items-center gap-1 text-xs text-black/50"><i className="inline-block h-2 w-3 bg-black/15" /> viewed</span><span className="flex items-center gap-1 text-xs text-black/50"><i className="inline-block h-2 w-3 bg-brand" /> submitted</span></div>
        <svg viewBox={`0 0 ${series.length * 10} 120`} preserveAspectRatio="none" className="h-36 w-full">
          {series.map((s, i) => { const v = (s.views / maxV) * 110, su = (s.submits / maxV) * 110; return <g key={i}><rect x={i * 10 + 1} y={115 - v} width={8} height={v} fill="rgba(0,0,0,.12)"><title>{s.day}: {s.views} views</title></rect><rect x={i * 10 + 1} y={115 - su} width={8} height={su} fill="#3b5bdb"><title>{s.day}: {s.submits} signups</title></rect></g>; })}
        </svg>
        <div className="flex justify-between text-[10px] text-black/40"><span>{series[0]?.day}</span><span>{series[series.length - 1]?.day}</span></div>
      </div>
      {pages.length > 0 && <div className="mt-4 rounded-lg border border-black/10 bg-white p-4"><div className="mb-2 text-sm font-medium">By page</div>
        <table className="w-full text-sm"><thead className="text-left text-xs uppercase tracking-wide text-black/50"><tr><th className="py-1">Page</th><th className="py-1 text-right">Views</th><th className="py-1 text-right">Signups</th><th className="py-1 text-right">Rate</th></tr></thead>
        <tbody>{pages.map(p => <tr key={p.page} className="border-t border-black/5"><td className="py-1 font-mono text-xs">{p.page}</td><td className="py-1 text-right tabular-nums">{p.views}</td><td className="py-1 text-right tabular-nums">{p.submits}</td><td className="py-1 text-right tabular-nums">{pct(p.submits, p.views)}</td></tr>)}</tbody></table></div>}
    </div>
  );
}
