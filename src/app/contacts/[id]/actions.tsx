"use client";
import { useRouter } from "next/navigation";
export function ProfileActions({ id, status, email }: { id: number; status: string; email: string }) {
  const r = useRouter();
  const act = async (action: string) => { await fetch(`/api/contacts/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) }); r.refresh(); };
  const del = async () => { if (!confirm(`Delete ${email} and all their history? The address stays on the suppression list so it can't be re-imported.`)) return; await fetch(`/api/contacts/${id}`, { method: "DELETE" }); r.push("/contacts"); };
  return (
    <aside className="h-fit space-y-2 rounded-lg border border-black/10 bg-white p-5 text-sm">
      <h2 className="font-medium">Actions</h2>
      {status === "subscribed" && <button onClick={() => act("unsubscribe")} className="w-full rounded-md border border-black/15 px-3 py-2 hover:border-black/40">Unsubscribe</button>}
      {status !== "suppressed" && <button onClick={() => act("suppress")} className="w-full rounded-md border border-black/15 px-3 py-2 hover:border-black/40">Suppress (never email)</button>}
      {status !== "subscribed" && <button onClick={() => { if (confirm("Only do this if they've asked to receive emails again.")) act("resubscribe"); }} className="w-full rounded-md border border-black/15 px-3 py-2 hover:border-black/40">Re-subscribe</button>}
      <button onClick={del} className="w-full rounded-md border border-red-200 px-3 py-2 text-red-700 hover:bg-red-50">Delete profile</button>
    </aside>
  );
}
