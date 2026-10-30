export const dynamic = "force-dynamic";
import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { translate } from "@/lib/rules";
import { METRICS } from "@/lib/sync/klaviyo-flows";
import { FlowStatus, EmailToggle, SendTest } from "../flow-controls";

type Email = { name: string; subject: string; previewText: string | null; templateId: number | null; status: string; ourTemplateId?: number | null; enabled?: boolean };
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

  // Linear timeline: follow the main path; a split continues down its YES branch and the NO branch is listed afterwards as its own section.
  const seen = new Set<string>();
  function walk(start: string | null): { main: Step[]; branches: { label: string; steps: Step[] }[] } {
    const main: Step[] = []; const branches: { label: string; steps: Step[] }[] = []; let cur = start;
    while (cur && !seen.has(cur)) {
      const st = byId.get(cur); if (!st) break; seen.add(cur); main.push(st);
      if (st.type === "conditional-split" || st.type === "trigger-split") {
        const t = translate((st.condition as { profile_filter?: { condition_groups?: [] } })?.profile_filter);
        const yes = walk(st.links.next_if_true); const no = walk(st.links.next_if_false);
        main.push(...yes.main); branches.push(...yes.branches);
        if (no.main.length) branches.push({ label: `Otherwise (not: ${t.words.replace(/\n/g, " ")})`, steps: no.main }); branches.push(...no.branches);
        break;
      }
      cur = st.links.next ?? null;
    }
    return { main, branches };
  }
  const tree = walk(def.entry);
  let emailNo = 0;
  function Timeline({ steps }: { steps: Step[] }) {
    return (
      <ol className="relative ml-3 border-l border-black/10 pl-6">
        {steps.map(st => {
          if (st.type === "time-delay") return <li key={st.id} className="relative py-2 text-sm text-black/50"><span className="absolute -left-[31px] top-2.5 h-2.5 w-2.5 rounded-full border-2 border-black/20 bg-white" />{delayWords(st.delay)}</li>;
          if (st.type === "conditional-split" || st.type === "trigger-split") { const t = translate((st.condition as { profile_filter?: { condition_groups?: [] } })?.profile_filter); return <li key={st.id} className="relative py-2 text-sm"><span className="absolute -left-[31px] top-2.5 h-2.5 w-2.5 rotate-45 bg-amber-400" /><span className="text-amber-800">If {t.words.replace(/\n/g, " ")} →</span></li>; }
          if ((st.type === "send-email" || st.type === "ab-test") && st.email) { emailNo++; return <li key={st.id} className="relative py-2"><span className="absolute -left-[36px] top-3 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-[10px] font-semibold text-white">{emailNo}</span><StepCard s={st} /></li>; }
          return null;
        })}
      </ol>
    );
  }

  function EmailCard({ e, label, stepId, variant }: { e: Email; label?: string; stepId: string; variant?: number }) {
    const on = e.enabled ?? e.status === "live";
    return (
      <div className="flex gap-3">
        <div className="h-24 w-20 shrink-0 overflow-hidden rounded border border-black/10 bg-black/5">{e.templateId && heroOf.get(e.templateId) && <img src={heroOf.get(e.templateId)!} alt="" className="h-full w-full object-cover object-top" />}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><span className="truncate font-medium">{label ? `${label}: ` : ""}{e.name}</span><span className={`rounded px-1.5 py-0.5 text-[10px] ${on ? "bg-brand/10 text-brand" : "bg-black/5 text-black/50"}`}>{on ? "will send" : "skipped"}</span></div>
          <div className="truncate text-sm text-black/70">{e.subject}</div>
          {e.previewText && <div className="truncate text-xs text-black/40">{e.previewText}</div>}
          <div className="mt-1 flex gap-3 text-xs">
            {e.templateId && <Link href={`/templates/${e.templateId}`} className="text-brand hover:underline">Preview</Link>}
            {e.ourTemplateId && <Link href={`/templates/${e.ourTemplateId}`} className="text-brand hover:underline">Edit</Link>}
            {(e.ourTemplateId ?? e.templateId) && <SendTest templateId={Number(e.ourTemplateId ?? e.templateId)} subject={e.subject} />}
            <EmailToggle flowId={Number(f.id)} stepId={stepId} variant={variant} enabled={on} />
          </div>
        </div>
      </div>
    );
  }

  function StepCard({ s }: { s: Step }) {
    if (s.type === "time-delay") return <div className="flex items-center gap-2 text-sm text-black/60"><span className="rounded-full bg-black/5 px-2 py-0.5 text-xs">⏱</span>{delayWords(s.delay)}</div>;
    if (s.type === "send-email" && s.email) return <div className="rounded-lg border border-black/10 bg-white p-3"><EmailCard e={s.email} stepId={s.id} /></div>;
    if (s.type === "ab-test") return <div className="rounded-lg border border-black/10 bg-white p-3"><div className="mb-2 text-xs text-black/50">A/B test ({s.abStatus})</div>{s.email && <EmailCard e={s.email} label="A" stepId={s.id} />}{(s.variants ?? []).map((v, i) => <div key={i} className="mt-3 border-t border-black/5 pt-3"><EmailCard e={v} label={String.fromCharCode(66 + i)} stepId={s.id} variant={i} /></div>)}</div>;
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
      <div className="mt-2 flex items-center gap-3"><h1 className="text-2xl font-semibold">{String(f.name)}</h1><FlowStatus id={Number(f.id)} status={String(f.status)} /></div>
      <div className="mt-4 rounded-lg border border-black/10 bg-white p-4 text-sm">
        <div className="font-medium">{trigWords}</div>
        {!!trigFilter && <div className="mt-1 text-xs text-black/60">Only if: {JSON.stringify(trigFilter).includes("form_id") ? "a specific signup form was submitted" : translate(trigFilter).words}</div>}
        {!!def.profileFilter && <div className="mt-1 text-xs text-black/60">Profile filter: {pf.words.replace(/\n/g, " ")}</div>}
      </div>
      <div className="mt-6"><Timeline steps={tree.main} /></div>
      {tree.branches.map((b, i) => (<div key={i} className="mt-8"><div className="mb-2 text-sm font-medium text-black/60">{b.label}</div><Timeline steps={b.steps} /></div>))}
    </div>
  );
}
