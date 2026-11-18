"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function NewCampaignButton() {
  const r = useRouter(); const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false);
  const create = async (start: "last" | "scratch") => {
    setBusy(true);
    const { id } = await (await fetch("/api/campaigns", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ start }) })).json();
    r.push(`/campaigns/${id}`);
  };
  const opt = "w-full rounded-lg border border-black/10 p-4 text-left hover:border-brand disabled:opacity-50";
  return <>
    <button onClick={() => setOpen(true)} className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90">Create campaign</button>
    {open && <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" onClick={() => !busy && setOpen(false)}>
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold">New campaign</h2>
        <p className="mt-1 text-sm text-black/60">How do you want to start the email?</p>
        <div className="mt-4 space-y-3">
          <button disabled={busy} onClick={() => create("last")} className={opt}><div className="font-medium">Bring in last design</div><div className="text-sm text-black/60">A copy of your most recent campaign email, ready to edit.</div></button>
          <button disabled={busy} onClick={() => create("scratch")} className={opt}><div className="font-medium">Start from scratch</div><div className="text-sm text-black/60">A blank email with your brand colours and fonts.</div></button>
        </div>
        <button disabled={busy} onClick={() => setOpen(false)} className="mt-4 text-sm text-black/50 hover:text-black">{busy ? "Creating…" : "Cancel"}</button>
      </div>
    </div>}
  </>;
}
