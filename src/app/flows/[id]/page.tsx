export const dynamic = "force-dynamic";
import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { translate } from "@/lib/rules";
import { METRICS } from "@/lib/sync/klaviyo-flows";

type Email = { name: string; subject: string; previewText: string | null; templateId: number | null; status: string; ourTemplateId?: number | null };
type Step = { id: string; type: string; links: Record<string, string | null>; email?: Email; variants?: Email[]; delay?: { unit: string; value: number; delay_until_time?: string }; condition?: { profile_filter?: unknown }; abStatus?: string };

function delayWords(d: Step["delay"]) { if (!d) return ""; return `Wait ${d.value} ${d.unit}${d.value === 1 ? "" : ""}${d.delay_until_time ? ` (until ${d.delay_until_time.slice(0, 5)})` : ""}`; }

export default async function FlowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [f] = await sql`select * from flows where id = ${id}`;
  if (!f) notFound();
  const def = f.definition as { entry: string; triggers: { type: string; id?: string; trigger_filter?: unknown }[]; profileFilter?: unknown; steps: Step[] };
  const byId = new Map(def.steps.map(s => [s.id, s]));
  const heroes = await sql`select t.id, (select url from media m where t.html like '%' || split_part(m.url, '?', 1) || '%' and m.folder not like '%social%' order by m.width desc nulls last limit 1) as hero from templates t where t.source = 'klaviyo'`;
  const heroOf = new Map(heroes.map(h => [Number(h.id), h.hero as string | null]));

  // Walk the graph depth-first producing a nested list (branches rendered side by side)
  const seen = new Set<string>();
  function Chain({ start, depth = 0 }: { start: string | null; depth?: number }) {
    const items = []; let cur = start;
    while (cur && !seen.has(cur)) {
      const s = byId.get(cur); if (!s) break; seen.add(cur);
      items.push(<StepCard key={s.id} s={s} />);
      if (s.type === "conditional-split" || s.type === "trigger-split") {
        const t = translate((s.condition as { profile_filter?: { condition_groups?: [] } })?.profile_filter);
        items.push(
          <div key={s.id + "-split"} className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-dashed border-green-300 p-3"><div className="mb-2 text-xs font-medium text-green-700">YES → {t.words}</div><Chain start={s.links.next_if_true} depth={depth + 1} /></div>
            <div className="rounded-lg border border-dashed border-black/20 p-3"><div className="mb-2 text-xs font-medium text-black/50">NO</div><Chain start={s.links.next_if_false} depth={depth + 1} /></div>
          </div>);
        break;
      }
      cur = s.links.next ?? null;
    }
    return <div className="space-y-3">{items.length ? items : <div className="text-xs text-black/40">End</div>}</div>;
  }

  function EmailCard({ e, label }: { e: Email; label?: string }) {
    return (
      <div className="flex gap-3">
        <div className="h-24 w-20 shrink-0 overflow-hidden rounded border border-black/10 bg-black/5">{e.templateId && heroOf.get(e.templateId) && <img src={heroOf.get(e.templateId)!} alt="" className="h-full w-full object-cover object-top" />}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><span className="truncate font-medium">{label ? `${label}: ` : ""}{e.name}</span><span className={`rounded px-1.5 py-0.5 text-[10px] ${e.status === "live" ? "bg-green-100 text-green-800" : "bg-black/5 text-black/50"}`}>{e.status}</span></div>
          <div className="truncate text-sm text-black/70">{e.subject}</div>
          {e.previewText && <div className="truncate text-xs text-black/40">{e.previewText}</div>}
          <div className="mt-1 flex gap-3 text-xs">
            {e.templateId && <Link href={`/templates/${e.templateId}`} className="text-brand hover:underline">Klaviyo version</Link>}
            {e.ourTemplateId ? <Link href={`/templates/${e.ourTemplateId}`} className="text-brand hover:underline">Our version</Link> : <span className="text-black/40">Our version: not built yet</span>}
          </div>
        </div>
      </div>
    );
  }

  function StepCard({ s }: { s: Step }) {
    if (s.type === "time-delay") return <div className="flex items-center gap-2 text-sm text-black/60"><span className="rounded-full bg-black/5 px-2 py-0.5 text-xs">⏱</span>{delayWords(s.delay)}</div>;
    if (s.type === "send-email" && s.email) return <div className="rounded-lg border border-black/10 bg-white p-3"><EmailCard e={s.email} /></div>;
    if (s.type === "ab-test") return <div className="rounded-lg border border-black/10 bg-white p-3"><div className="mb-2 text-xs text-black/50">A/B test ({s.abStatus})</div>{s.email && <EmailCard e={s.email} label="A" />}{(s.variants ?? []).map((v, i) => <div key={i} className="mt-3 border-t border-black/5 pt-3"><EmailCard e={v} label={String.fromCharCode(66 + i)} /></div>)}</div>;
    if (s.type === "conditional-split" || s.type === "trigger-split") return <div className="text-sm font-medium">Split</div>;
    return <div className="text-xs text-black/50">{s.type}</div>;
  }

  const trig = def.triggers?.[0];
  const trigWords = trig?.type === "metric" ? `When: ${METRICS[trig.id ?? ""] ?? trig.id}` : `When: ${trig?.type ?? f.trigger}`;
  const trigFilter = (trig as { trigger_filter?: { condition_groups?: [] } })?.trigger_filter;
  const pf = translate(def.profileFilter as { condition_groups?: [] } | null);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Link href="/flows" className="text-sm text-black/50 hover:text-black">← Flows</Link>
      <div className="mt-2 flex items-center gap-3"><h1 className="text-2xl font-semibold">{String(f.name)}</h1><span className={`rounded px-2 py-0.5 text-xs ${f.klaviyo_status === "live" ? "bg-green-100 text-green-800" : "bg-black/5 text-black/60"}`}>Klaviyo: {String(f.klaviyo_status)}</span><span className="rounded bg-black/5 px-2 py-0.5 text-xs text-black/60">Here: {String(f.status)}</span></div>
      <div className="mt-4 rounded-lg border border-black/10 bg-white p-4 text-sm">
        <div className="font-medium">{trigWords}</div>
        {!!trigFilter && <div className="mt-1 text-xs text-black/60">Only if: {JSON.stringify(trigFilter).includes("form_id") ? "a specific signup form was submitted" : translate(trigFilter).words}</div>}
        {!!def.profileFilter && <div className="mt-1 text-xs text-black/60">Profile filter: {pf.words.replace(/\n/g, " ")}</div>}
      </div>
      <div className="mt-6"><Chain start={def.entry} /></div>
    </div>
  );
}
