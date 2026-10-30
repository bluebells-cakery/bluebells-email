"use client";
import { useEffect, useState } from "react";

type F = { label: string; family: string; google: string; fallback: string };

export function ExtraFonts() {
  const [fonts, setFonts] = useState<F[]>([]); const [name, setName] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { fetch("/api/brand/fonts").then(r => r.json()).then(j => setFonts(j.fonts)); }, []);
  const add = async () => {
    if (!name.trim()) return; setBusy(true); setErr("");
    const r = await fetch("/api/brand/fonts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ family: name }) });
    const j = await r.json(); setBusy(false);
    if (!r.ok) return setErr(j.error); setFonts(j.fonts); setName("");
  };
  const remove = async (family: string) => { const r = await fetch("/api/brand/fonts", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ family }) }); setFonts((await r.json()).fonts); };
  return (
    <div className="mt-4 rounded-lg border border-black/10 bg-white p-5">
      <div className="text-xs uppercase tracking-wide text-black/50">Extra fonts in the editor</div>
      <p className="mt-1 text-sm text-black/60">Add any Google Font by name — it appears in the template editor's font list alongside Crimson Pro and Poppins.</p>
      <div className="mt-3 flex gap-2">
        <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} placeholder="e.g. Playfair Display" className="w-64 rounded border border-black/10 px-3 py-1.5 text-sm" />
        <button onClick={add} disabled={busy} className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">Add font</button>
      </div>
      {err && <div className="mt-2 text-xs text-red-600">{err}</div>}
      <ul className="mt-3 flex flex-wrap gap-2">
        {fonts.map(f => (
          <li key={f.family} className="flex items-center gap-2 rounded-full border border-black/10 px-3 py-1 text-sm">
            <link rel="stylesheet" href={`https://fonts.googleapis.com/css2?family=${f.google}&display=swap`} />
            <span style={{ fontFamily: `'${f.family}', ${f.fallback}` }}>{f.label}</span>
            <button onClick={() => remove(f.family)} className="text-black/40 hover:text-black">✕</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
