"use client";
import { useState } from "react";

/** "Bring in last design" / "Start from scratch" picker. onPick does the work; the modal shows busy until it navigates away. */
export function StartChoice({ title, onPick, onClose }: { title: string; onPick: (s: "last" | "scratch") => Promise<void>; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const go = async (s: "last" | "scratch") => { setBusy(true); try { await onPick(s); } catch { setBusy(false); } };
  const opt = "w-full rounded-lg border border-black/10 p-4 text-left hover:border-brand disabled:opacity-50";
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" onClick={() => !busy && onClose()}>
    <div className="w-full max-w-md rounded-xl bg-white p-6 text-left shadow-xl" onClick={e => e.stopPropagation()}>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-black/60">How do you want to start the email?</p>
      <div className="mt-4 space-y-3">
        <button disabled={busy} onClick={() => go("last")} className={opt}><div className="font-medium">Bring in last design</div><div className="text-sm text-black/60">A copy of your most recent campaign email, ready to edit.</div></button>
        <button disabled={busy} onClick={() => go("scratch")} className={opt}><div className="font-medium">Start from scratch</div><div className="text-sm text-black/60">A blank email with your brand colours and fonts.</div></button>
      </div>
      <button disabled={busy} onClick={onClose} className="mt-4 text-sm text-black/50 hover:text-black">{busy ? "Setting up…" : "Cancel"}</button>
    </div>
  </div>;
}

/** Open editor button that works whether or not the campaign has an email yet. */
export function OpenEditor({ id, templateId, className, label = "Open editor" }: { id: number; templateId: number | null | undefined; className: string; label?: string }) {
  const [ask, setAsk] = useState(false);
  if (templateId) return <a href={`/templates/${templateId}?campaign=${id}`} className={className}>{label}</a>;
  return <>
    <button onClick={() => setAsk(true)} className={className}>{label}</button>
    {ask && <StartChoice title="Design this email" onClose={() => setAsk(false)} onPick={async s => {
      const res = await fetch(`/api/campaigns/${id}/start`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ start: s }) });
      const j = await res.json(); if (!res.ok) { alert(j.error ?? "Couldn't set up the email"); throw new Error(); }
      window.location.href = j.url;
    }} />}
  </>;
}
