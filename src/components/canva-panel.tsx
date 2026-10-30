"use client";
import { useEffect, useState } from "react";

type D = { id: string; title?: string; updated_at: number; thumbnail?: { url: string }; urls?: { edit_url: string }; imported: boolean };

export function CanvaPanel({ onImported, onClose }: { onImported: () => void; onClose: () => void }) {
  const [state, setState] = useState<{ connected: boolean; items: D[]; error?: string; continuation?: string } | null>(null);
  const [q, setQ] = useState(""); const [busy, setBusy] = useState<string | null>(null);
  const load = async (query = q) => { const r = await fetch(`/api/canva/designs?q=${encodeURIComponent(query)}`); setState(await r.json()); };
  useEffect(() => { load(""); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const imp = async (id: string) => { setBusy(id); const r = await fetch("/api/canva/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ designId: id }) }); setBusy(null); if (r.ok) { onImported(); load(); } else alert((await r.json()).error); };
  return (
    <div className="flex h-full w-[460px] flex-col border-l border-black/10 bg-white">
      <div className="flex items-center gap-2 border-b border-black/10 px-3 py-2"><span className="text-sm font-medium">Canva designs</span><div className="flex-1" /><button onClick={onClose} className="text-xs text-black/50 hover:text-black">Close</button></div>
      {state && !state.connected ? (
        <div className="p-4 text-sm"><p className="text-black/60">Connect the Canva account your social media manager uses; her designs will then be listed here and importable as PNGs.</p><a href="/api/canva/install" className="mt-3 inline-block rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white">Connect Canva</a></div>
      ) : (<>
        <div className="flex gap-2 border-b border-black/10 p-2"><input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === "Enter" && load()} placeholder="Search designs…" className="flex-1 rounded border border-black/10 px-2 py-1 text-sm" /><button onClick={() => load()} className="rounded border border-black/15 px-2 text-sm">Search</button></div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {state?.error && <div className="p-2 text-xs text-red-600">{state.error}</div>}
          <ul className="grid grid-cols-2 gap-2">
            {state?.items.map(d => (
              <li key={d.id} className="rounded border border-black/10 p-2">
                <div className="aspect-square overflow-hidden rounded bg-black/5">{d.thumbnail && <img src={d.thumbnail.url} alt="" className="h-full w-full object-contain" />}</div>
                <div className="mt-1 truncate text-xs font-medium" title={d.title}>{d.title || "Untitled"}</div>
                <div className="mt-1 flex items-center gap-2 text-[11px]">
                  <button disabled={busy === d.id} onClick={() => imp(d.id)} className="rounded bg-brand px-2 py-0.5 font-medium text-white disabled:opacity-50">{busy === d.id ? "Importing…" : d.imported ? "Re-import" : "Import"}</button>
                  {d.imported && <span className="text-green-700">in library</span>}
                  {d.urls?.edit_url && <a href={d.urls.edit_url} target="_blank" className="ml-auto text-black/50 hover:text-black">Open ↗</a>}
                </div>
              </li>
            ))}
          </ul>
          {state && state.items.length === 0 && !state.error && <p className="p-2 text-xs text-black/50">No designs found.</p>}
        </div>
      </>)}
    </div>
  );
}
