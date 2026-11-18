"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { OpenEditor } from "./start-choice";
export function RowActions({ id, status, name, templateId }: { id: number; status: string; name: string; templateId?: number | null }) {
  const r = useRouter(); const [busy, setBusy] = useState(false);
  const dup = async () => { setBusy(true); const { id: nid } = await (await fetch(`/api/campaigns/${id}/duplicate`, { method: "POST" })).json(); r.push(`/campaigns/${nid}`); };
  const del = async () => { if (!confirm(`Delete "${name}"? This can't be undone.`)) return; setBusy(true); await fetch(`/api/campaigns/${id}`, { method: "DELETE" }); r.refresh(); setBusy(false); };
  const cls = "rounded border border-black/10 px-2 py-0.5 text-xs hover:border-black/40 disabled:opacity-40";
  return <div className="flex justify-end gap-1 whitespace-nowrap">
    {status === "draft" && <OpenEditor id={id} templateId={templateId} className={`${cls} border-brand/40 text-brand`} />}
    <button disabled={busy} onClick={dup} className={cls} title="Duplicate as a new draft">Duplicate</button>
    {status === "draft" && <button disabled={busy} onClick={del} className={`${cls} text-red-700`}>Delete</button>}
  </div>;
}
