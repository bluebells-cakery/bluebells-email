"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { StartChoice } from "./start-choice";
export function NewCampaignButton() {
  const r = useRouter(); const [open, setOpen] = useState(false);
  return <>
    <button onClick={() => setOpen(true)} className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90">Create campaign</button>
    {open && <StartChoice title="New campaign" onClose={() => setOpen(false)} onPick={async start => {
      const { id } = await (await fetch("/api/campaigns", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ start }) })).json();
      r.push(`/campaigns/${id}`);
    }} />}
  </>;
}
