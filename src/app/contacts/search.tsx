"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
type C = { id: number; email: string; first_name: string | null; last_name: string | null; status: string; city: string | null; order_count: number; total_spent: string; last_order_at: string | null };
export function ProfileSearch() {
  const [q, setQ] = useState(""); const [items, setItems] = useState<C[]>([]);
  const load = async (s = q) => { if (s.trim().length < 2) return setItems([]); setItems((await (await fetch(`/api/contacts?q=${encodeURIComponent(s)}`)).json()).items); };
  useEffect(() => { const t = setTimeout(() => load(q), 200); return () => clearTimeout(t); }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  const act = async (c: C, action: string) => {
    if (action === "delete") { if (!confirm(`Delete ${c.email} and all their history?`)) return; await fetch(`/api/contacts/${c.id}`, { method: "DELETE" }); }
    else { if (action === "suppress" && !confirm(`Suppress ${c.email}? They will never be emailed again.`)) return; await fetch(`/api/contacts/${c.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) }); }
    load();
  };
  return (
    <div className="mt-10">
      <h2 className="text-lg font-semibold">Profiles</h2>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by email or name…" className="mt-3 w-full max-w-lg rounded border border-black/10 bg-white px-3 py-2 text-sm" />
      {items.length > 0 && (
        <table className="mt-3 w-full border-separate border-spacing-0 overflow-hidden rounded-lg border border-black/10 bg-white text-sm">
          <thead className="bg-black/[.03] text-left text-xs uppercase tracking-wide text-black/50"><tr><th className="px-4 py-2">Email</th><th className="px-4 py-2">Name</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">City</th><th className="px-4 py-2 text-right">Orders</th><th className="px-4 py-2 text-right">Spent</th><th className="px-4 py-2 text-right">Actions</th></tr></thead>
          <tbody>{items.map(c => <tr key={c.id} className="border-t border-black/5"><td className="px-4 py-2"><Link href={`/contacts/${c.id}`} className="text-brand hover:underline">{c.email}</Link></td><td className="px-4 py-2">{[c.first_name, c.last_name].filter(Boolean).join(" ")}</td><td className="px-4 py-2"><span className={`rounded px-2 py-0.5 text-xs ${c.status === "subscribed" ? "bg-green-100 text-green-800" : "bg-black/5 text-black/60"}`}>{c.status.replace("_", " ")}</span></td><td className="px-4 py-2 text-black/60">{c.city ?? ""}</td><td className="px-4 py-2 text-right tabular-nums">{c.order_count}</td><td className="px-4 py-2 text-right tabular-nums">${Math.round(Number(c.total_spent)).toLocaleString()}</td>
            <td className="px-4 py-2 text-right text-xs whitespace-nowrap">
              {c.status === "subscribed" ? <button onClick={() => act(c, "unsubscribe")} className="text-black/60 hover:text-black">Unsubscribe</button> : <button onClick={() => act(c, "resubscribe")} className="text-black/60 hover:text-black">Re-subscribe</button>}
              {c.status !== "suppressed" && <button onClick={() => act(c, "suppress")} className="ml-3 text-black/60 hover:text-black">Suppress</button>}
              <button onClick={() => act(c, "delete")} className="ml-3 text-red-600 hover:underline">Delete</button>
            </td></tr>)}</tbody>
        </table>)}
      {q.length >= 2 && items.length === 0 && <p className="mt-2 text-sm text-black/50">No matches.</p>}
    </div>
  );
}
