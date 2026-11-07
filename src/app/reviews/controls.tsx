"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ReviewSettings({ enabled, days, time, notify }: { enabled: boolean; days: number; time: string; notify: string }) {
  const r = useRouter(); const [n, setN] = useState(notify); const [d, setD] = useState(days); const [t, setT] = useState(time); const [on, setOn] = useState(enabled); const [msg, setMsg] = useState("");
  const save = async (patch: Record<string, unknown>) => {
    setMsg("Saving…");
    const res = await fetch("/api/reviews", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
    setMsg(res.ok ? "Saved" : "Save failed"); r.refresh(); setTimeout(() => setMsg(""), 1500);
  };
  return (
    <div className="space-y-4">
      <label className="flex items-center justify-between gap-4">
        <span><span className="font-medium">Send review requests</span><span className="block text-xs text-black/50">Off pauses new sends; queued ones wait until it's back on.</span></span>
        <button onClick={() => { setOn(!on); save({ enabled: !on }); }} className={`relative h-6 w-11 rounded-full transition ${on ? "bg-[#e4c5e0]" : "bg-black/20"}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full transition ${on ? "left-[22px] bg-[#262967]" : "left-0.5 bg-white"}`} /></button>
      </label>
      <div className="flex flex-wrap items-end gap-3 text-sm">
        <label>Days after delivery / pickup date<input type="number" min={0} max={60} value={d} onChange={e => setD(Number(e.target.value))} className="mt-1 block w-24 rounded border border-black/15 px-2 py-1" /></label>
        <label>Send time (NZ)<input type="time" value={t} onChange={e => setT(e.target.value)} className="mt-1 block w-28 rounded border border-black/15 px-2 py-1" /></label>
        <button onClick={() => save({ days: d, time: t })} className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white">Save timing</button>
        {msg && <span className="text-xs text-black/50">{msg}</span>}
      </div>
      <div className="flex flex-wrap items-end gap-3 text-sm">
        <label className="min-w-0 flex-1">Email me new reviews at<input value={n} onChange={e => setN(e.target.value)} placeholder="ryan@bluebellscakery.co.nz" className="mt-1 block w-full rounded border border-black/15 px-2 py-1" /></label>
        <button onClick={() => save({ notify: n })} className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white">Save</button>
      </div>
      <p className="text-xs text-black/50">New timing applies to orders that reach this step from now on; already-scheduled requests keep their date.</p>
    </div>
  );
}

export function TestSend({ templateId, to }: { templateId: number; to: string }) {
  const [s, setS] = useState("");
  return <span className="inline-flex items-center gap-2">
    <button onClick={async () => { setS("Sending…"); const r = await fetch("/api/flows/test", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ templateId, to }) }); setS(r.ok ? `Sent to ${to}` : "Failed"); }} className="rounded-md border border-black/15 px-3 py-1.5 text-sm hover:border-black/40">Send test to me</button>
    {s && <span className="text-xs text-black/50">{s}</span>}
  </span>;
}

export function SkipButton({ runId }: { runId: number }) {
  const r = useRouter(); const [busy, setBusy] = useState(false);
  return <button disabled={busy} onClick={async () => { if (!confirm("Skip this customer's review request?")) return; setBusy(true); await fetch("/api/reviews/skip", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ runId }) }); r.refresh(); }} className="rounded border border-black/10 px-2 py-0.5 text-xs hover:border-red-400 hover:text-red-700 disabled:opacity-40">Skip</button>;
}
