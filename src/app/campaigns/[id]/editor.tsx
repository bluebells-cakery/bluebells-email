"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Audience = { include: "subscribed" | "segments"; segment_ids: number[]; exclude_segment_ids: number[] };
type C = { id: number; name: string; subject: string | null; preview_text: string | null; from_name: string | null; template_id: number | null; html: string | null; status: string; scheduled_at: string | null; recipient_count: number | null; audience: Audience; sent_at: string | null };
type T = { id: number; name: string; kind: string; subject: string | null };
type S = { id: number; name: string; supported: boolean };

export function CampaignEditor({ campaign, templates, segments, stats }: { campaign: C; templates: T[]; segments: S[]; stats: { sent: number; queued: number; skipped: number; failed: number } }) {
  const r = useRouter();
  const [c, setC] = useState(campaign); const [count, setCount] = useState<number | null>(null); const [msg, setMsg] = useState(""); const [when, setWhen] = useState("");
  const locked = !["draft", "scheduled"].includes(c.status);
  const patch = async (b: Record<string, unknown>) => { const res = await fetch(`/api/campaigns/${c.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(b) }); if (!res.ok) setMsg((await res.json()).error); return res.ok; };
  useEffect(() => { fetch("/api/audience", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(c.audience) }).then(r => r.json()).then(j => setCount(j.count)); }, [c.audience]);
  const setAud = (a: Partial<Audience>) => { const audience = { ...c.audience, ...a }; setC({ ...c, audience }); patch({ audience }); };
  const toggle = (list: "segment_ids" | "exclude_segment_ids", id: number) => setAud({ [list]: c.audience[list].includes(id) ? c.audience[list].filter(x => x !== id) : [...c.audience[list], id] });
  const act = async (action: "send" | "schedule" | "cancel") => {
    if (action !== "cancel" && !confirm(`${action === "send" ? "Send now" : "Schedule"} to ${count?.toLocaleString()} people?`)) return;
    if (await patch({ action, scheduled_at: when ? new Date(when).toISOString() : null })) r.refresh();
  };
  const Field = ({ l, k, ph }: { l: string; k: "name" | "subject" | "preview_text" | "from_name"; ph?: string }) => (
    <label className="block"><span className="text-xs uppercase tracking-wide text-black/50">{l}</span>
      <input disabled={locked} defaultValue={c[k] ?? ""} placeholder={ph} onBlur={e => { setC({ ...c, [k]: e.target.value }); patch({ [k]: e.target.value }); }} className="mt-1 w-full rounded border border-black/10 bg-white px-3 py-2 text-sm disabled:bg-black/5" /></label>);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Link href="/campaigns" className="text-sm text-black/50 hover:text-black">← Campaigns</Link>
      <div className="mt-2 flex items-center gap-3"><h1 className="text-2xl font-semibold">{c.name}</h1><span className="rounded bg-black/5 px-2 py-0.5 text-xs">{c.status}</span></div>
      {locked && <div className="mt-4 rounded-lg border border-black/10 bg-white p-4 text-sm">Sent {stats.sent.toLocaleString()} · queued {stats.queued.toLocaleString()} · skipped {stats.skipped.toLocaleString()} · failed {stats.failed}{c.sent_at && ` · completed ${new Date(c.sent_at).toLocaleString("en-NZ")}`}</div>}
      <div className="mt-6 grid gap-8 md:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <section className="rounded-lg border border-black/10 bg-white p-5 space-y-3">
            <h2 className="font-medium">1. Details</h2>
            <Field l="Campaign name" k="name" /><Field l="Subject line" k="subject" ph="e.g. Christmas pre-orders are open 🎄" /><Field l="Preview text" k="preview_text" ph="Shown next to the subject in the inbox" /><Field l="From name" k="from_name" />
          </section>
          <section className="rounded-lg border border-black/10 bg-white p-5">
            <h2 className="font-medium">2. Email</h2>
            <div className="mt-3 flex items-center gap-3">
              <select disabled={locked} value={c.template_id ?? ""} onChange={async e => { const id = Number(e.target.value) || null; await patch({ template_id: id }); const t = templates.find(x => x.id === id); setC({ ...c, template_id: id, html: id ? "x" : null, subject: c.subject || t?.subject || null }); r.refresh(); }} className="rounded border border-black/10 px-3 py-2 text-sm">
                <option value="">Choose a template…</option>
                <optgroup label="My templates">{templates.filter(t => t.kind === "unlayer").map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</optgroup>
                <optgroup label="Past Klaviyo campaigns">{templates.filter(t => t.kind !== "unlayer").map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</optgroup>
              </select>
              {c.template_id && <Link href={`/templates/${c.template_id}`} className="text-sm text-brand hover:underline">Open in editor</Link>}
              {c.template_id && <a href={`/api/campaigns/${c.id}/preview`} target="_blank" className="text-sm text-brand hover:underline">Preview</a>}
            </div>
            <p className="mt-2 text-xs text-black/50">The template's HTML is copied into the campaign when you pick it — re-select it after editing to pull in changes.</p>
          </section>
          <section className="rounded-lg border border-black/10 bg-white p-5">
            <h2 className="font-medium">3. Audience</h2>
            <div className="mt-3 flex gap-4 text-sm">
              <label className="flex items-center gap-2"><input type="radio" disabled={locked} checked={c.audience.include === "subscribed"} onChange={() => setAud({ include: "subscribed" })} /> All subscribers</label>
              <label className="flex items-center gap-2"><input type="radio" disabled={locked} checked={c.audience.include === "segments"} onChange={() => setAud({ include: "segments" })} /> Segments</label>
            </div>
            {c.audience.include === "segments" && <div className="mt-3 grid grid-cols-2 gap-1 text-sm">{segments.filter(s => s.supported).map(s => <label key={s.id} className="flex items-center gap-2"><input type="checkbox" disabled={locked} checked={c.audience.segment_ids.includes(s.id)} onChange={() => toggle("segment_ids", s.id)} />{s.name}</label>)}</div>}
            <div className="mt-4 text-xs uppercase tracking-wide text-black/50">Exclude</div>
            <div className="mt-1 grid grid-cols-2 gap-1 text-sm">{segments.filter(s => s.supported).map(s => <label key={s.id} className="flex items-center gap-2"><input type="checkbox" disabled={locked} checked={c.audience.exclude_segment_ids.includes(s.id)} onChange={() => toggle("exclude_segment_ids", s.id)} />{s.name}</label>)}</div>
            <div className="mt-4 text-sm">Estimated recipients: <b>{count?.toLocaleString() ?? "…"}</b> <span className="text-black/50">(subscribed, not suppressed)</span></div>
          </section>
        </div>
        <aside className="h-fit rounded-lg border border-black/10 bg-white p-5 text-sm">
          <h2 className="font-medium">4. Send</h2>
          {c.status === "draft" && (<>
            <button onClick={() => act("send")} disabled={!c.html || !c.subject} className="mt-3 w-full rounded-md bg-brand px-4 py-2 font-medium text-white disabled:opacity-40">Send now</button>
            <div className="my-3 text-center text-xs text-black/40">or</div>
            <input type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} className="w-full rounded border border-black/10 px-2 py-1.5" />
            <button onClick={() => act("schedule")} disabled={!when || !c.html || !c.subject} className="mt-2 w-full rounded-md border border-brand px-4 py-2 font-medium text-brand disabled:opacity-40">Schedule</button>
          </>)}
          {c.status === "scheduled" && (<><div className="mt-2">Scheduled for {c.scheduled_at ? new Date(c.scheduled_at).toLocaleString("en-NZ") : "now"} · {c.recipient_count?.toLocaleString()} recipients</div><button onClick={() => act("cancel")} className="mt-3 w-full rounded-md border border-black/15 px-4 py-2">Cancel schedule</button></>)}
          {msg && <div className="mt-3 text-xs text-red-600">{msg}</div>}
          <p className="mt-4 text-xs text-black/50">Sends respect the engine mode on the Flows page (shadow / test / live) and SES's hourly limits; big sends drain over a few minutes.</p>
        </aside>
      </div>
    </div>
  );
}
