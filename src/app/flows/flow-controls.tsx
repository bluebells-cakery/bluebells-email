"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function FlowStatus({ id, status }: { id: number; status: string }) {
  const r = useRouter();
  const set = async (s: string) => { if (s === "live" && !confirm("Switch this flow on here? (Remember to pause it in Klaviyo so customers don't get both.)")) return; await fetch(`/api/flows/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: s }) }); r.refresh(); };
  return (
    <select value={status} onChange={e => set(e.target.value)} className={`rounded border px-2 py-1 text-sm ${status === "live" ? "border-green-300 bg-green-50 text-green-800" : "border-black/15"}`}>
      <option value="draft">Off</option><option value="live">On (live)</option><option value="paused">Paused</option>
    </select>
  );
}

export function EmailToggle({ flowId, stepId, variant, enabled }: { flowId: number; stepId: string; variant?: number; enabled: boolean }) {
  const r = useRouter();
  return <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={enabled} onChange={async e => { await fetch(`/api/flows/${flowId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ stepId, variant, enabled: e.target.checked }) }); r.refresh(); }} /> send</label>;
}

export function SendTest({ templateId, subject }: { templateId: number; subject: string }) {
  const [st, setSt] = useState("");
  return <button onClick={async () => { setSt("…"); const r = await fetch("/api/flows/test", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ templateId, to: "ryan@bluebellscakery.co.nz", subject }) }); setSt(r.ok ? "sent ✓" : "failed: " + (await r.json()).error); }} className="text-xs text-brand hover:underline">{st || "Send test to me"}</button>;
}
