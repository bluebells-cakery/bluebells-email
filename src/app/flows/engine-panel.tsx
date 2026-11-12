"use client";
import { useEffect, useState } from "react";

type S = { provider: string; ses: { ok: boolean; detail: string }; sentByProvider: Record<string, number>; campaignsPaused: string | null; mode: string; testEmails: string; smartHours: number; queue: { queued: number; sent24: number; skipped24: number; failed: number }; runs: { active: number; done: number }; lastTick: { at: string; out: Record<string, unknown> } | null };

export function EnginePanel() {
  const [s, setS] = useState<S | null>(null); const [emails, setEmails] = useState("");
  const load = async () => { const j = await (await fetch("/api/engine")).json(); setS(j); setEmails(j.testEmails); };
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, []);
  const set = async (b: Record<string, unknown>) => { const res = await fetch("/api/engine", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) }); const j = await res.json(); if (!res.ok) { alert(j.error ?? "Not allowed"); return; } setS(j); };
  if (!s) return null;
  const Mode = ({ m, l, d }: { m: string; l: string; d: string }) => (
    <button onClick={() => { if (m !== "live" || confirm("Go LIVE: real emails go to real customers. Continue?")) set({ mode: m }); }} className={`rounded-md border px-3 py-1.5 text-left text-sm ${s.mode === m ? "border-brand bg-brand/10 text-brand" : "border-black/15 hover:border-black/40"}`}><div className="font-medium">{l}</div><div className="text-xs text-black/50">{d}</div></button>
  );
  return (
    <div className="mt-6 rounded-lg border border-black/10 bg-white p-4">
      {s.campaignsPaused && <div className="mb-3 rounded border border-red-300 bg-red-50 p-2 text-sm text-red-800">Campaign sends paused automatically — bounce/complaint rate too high in the last 24h ({s.campaignsPaused}). Flows continue. See Dashboard → Deliverability.</div>}
      <div className="flex flex-wrap items-start gap-6">
        <div>
          <div className="mb-2 text-xs uppercase tracking-wide text-black/50">Sending mode</div>
          <div className="flex gap-2"><Mode m="shadow" l="Shadow" d="Run flows, send nothing" /><Mode m="test" l="Test" d="Send only to test addresses" /><Mode m="live" l="Live" d="Send to customers" /></div>
          <div className="mb-2 mt-4 text-xs uppercase tracking-wide text-black/50">Default provider <span className="normal-case tracking-normal">(flows, review emails, and campaigns set to Default)</span></div>
          <div className="flex gap-2">{[["resend", "Resend", `${s.sentByProvider.resend ?? 0} sent 24h`], ["ses", "Amazon SES", `${s.ses.ok ? "Ready" : "Not ready"} · ${s.sentByProvider.ses ?? 0} sent 24h`]].map(([p, l, d]) => (
            <button key={p} onClick={() => { if (p === s.provider) return; if (p === "ses" && !s.ses.ok) { alert("Amazon SES isn't ready: " + s.ses.detail); return; } if (confirm(`Switch default sending to ${l}?`)) set({ provider: p }); }} className={`rounded-md border px-3 py-1.5 text-left text-sm ${s.provider === p ? "border-brand bg-brand/10 text-brand" : "border-black/15 hover:border-black/40"}`}><div className="font-medium">{l}</div><div className="text-xs text-black/50">{d}</div></button>))}</div>
          <div className="mt-1 text-xs text-black/50">SES: {s.ses.detail}</div>
          <div className="mt-2 flex items-center gap-2 text-xs"><span className="text-black/50">Smart sending: skip campaigns / hold flow emails if someone was emailed in the last</span><input type="number" min={0} max={72} defaultValue={s.smartHours} onBlur={e => set({ smartHours: e.target.value })} className="w-14 rounded border border-black/10 px-2 py-1" /><span className="text-black/50">hours</span></div>
          <div className="mt-2 flex items-center gap-2 text-xs"><span className="text-black/50">Test addresses</span><input value={emails} onChange={e => setEmails(e.target.value)} onBlur={() => set({ testEmails: emails })} className="w-80 rounded border border-black/10 px-2 py-1" /></div>
        </div>
        <div className="grid grid-cols-3 gap-x-6 gap-y-1 text-sm">
          <div><span className="text-black/50">Active runs</span> <b>{s.runs.active}</b></div><div><span className="text-black/50">Queued</span> <b>{s.queue.queued}</b></div><div><span className="text-black/50">Sent 24h</span> <b>{s.queue.sent24}</b></div>
          <div><span className="text-black/50">Completed runs</span> <b>{s.runs.done}</b></div><div><span className="text-black/50">Skipped 24h</span> <b>{s.queue.skipped24}</b></div><div><span className="text-black/50">Failed</span> <b className={s.queue.failed ? "text-red-600" : ""}>{s.queue.failed}</b></div>
        </div>
        <div className="text-xs text-black/50">Last tick: {s.lastTick ? `${new Date(s.lastTick.at).toLocaleTimeString("en-NZ")} · ${Object.entries(s.lastTick.out).map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`).join(" · ")}` : "never"}</div>
      </div>
    </div>
  );
}
