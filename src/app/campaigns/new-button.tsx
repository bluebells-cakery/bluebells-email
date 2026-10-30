"use client";
import { useRouter } from "next/navigation";
export function NewCampaignButton() {
  const r = useRouter();
  return <button onClick={async () => { const { id } = await (await fetch("/api/campaigns", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })).json(); r.push(`/campaigns/${id}`); }} className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90">Create campaign</button>;
}
