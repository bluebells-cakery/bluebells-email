"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { CanvaPanel } from "@/components/canva-panel";

export type MediaItem = { id: number; url: string; filename: string; mime: string; width: number | null; height: number | null; bytes: number; folder: string; tags: string[]; alt: string | null };
type Folder = { folder: string; n: number };

export function MediaLibrary({ onSelect, compact = false }: { onSelect?: (m: MediaItem) => void; compact?: boolean }) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [folder, setFolder] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [canva, setCanva] = useState(false);

  const load = useCallback(async () => {
    const p = new URLSearchParams(); if (q) p.set("q", q); if (folder) p.set("folder", folder);
    const r = await fetch(`/api/media?${p}`); const j = await r.json();
    setItems(j.items); setFolders(j.folders);
  }, [q, folder]);
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);

  const upload = async (files: FileList | File[]) => {
    if (!files.length) return;
    setBusy(true);
    const fd = new FormData(); fd.append("folder", folder ?? "uploads");
    for (const f of Array.from(files)) fd.append("files", f);
    await fetch("/api/media", { method: "POST", body: fd });
    setBusy(false); load();
  };

  return (
    <div className={`flex ${compact ? "h-full" : "h-[calc(100vh-3.5rem)]"} min-h-0`}
      onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files); }}>
      <aside className="w-64 shrink-0 overflow-y-auto border-r border-black/10 bg-white p-3 text-sm">
        <button onClick={() => setFolder(null)} className={`block w-full rounded px-2 py-1 text-left ${folder === null ? "bg-brand/10 text-brand" : "hover:bg-black/5"}`}>All files</button>
        {folders.map(f => (
          <button key={f.folder} onClick={() => setFolder(f.folder)} title={f.folder}
            className={`block w-full truncate rounded px-2 py-1 text-left ${folder === f.folder ? "bg-brand/10 text-brand" : "hover:bg-black/5"}`}>
            {f.folder || "(no folder)"} <span className="text-black/40">{f.n}</span>
          </button>
        ))}
      </aside>
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-black/10 bg-white px-4 py-2">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search files, folders, tags…" className="w-72 rounded border border-black/10 px-3 py-1.5 text-sm" />
          <span className="text-xs text-black/50">{items.length} files{folder ? ` in ${folder}` : ""}</span>
          <div className="flex-1" />
          <input ref={fileInput} type="file" multiple accept="image/*,.gif" className="hidden" onChange={e => e.target.files && upload(e.target.files)} />
          {!compact && <button onClick={() => setCanva(c => !c)} className={`rounded-md border px-3 py-1.5 text-sm font-medium ${canva ? "border-brand text-brand" : "border-black/15 hover:border-black/40"}`}>Canva</button>}
          <button onClick={() => fileInput.current?.click()} disabled={busy} className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">{busy ? "Uploading…" : "Upload"}</button>
        </div>
        <div className={`flex-1 overflow-y-auto p-4 ${drag ? "bg-brand/5 outline-2 outline-dashed outline-brand" : ""}`}>
          {items.length === 0 && <p className="text-sm text-black/50">No files — drop images here or click Upload.</p>}
          <ul className="grid grid-cols-3 gap-3 md:grid-cols-5 xl:grid-cols-6">
            {items.map(m => (
              <li key={m.id} className="relative">
                <button title="Copy image URL (paste into the editor's Image URL box)" onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(m.url).then(() => { const b = e.currentTarget as HTMLButtonElement; b.textContent = "Copied"; setTimeout(() => { b.textContent = "Copy URL"; }, 1200); }); }} className="absolute right-1 top-1 z-10 rounded bg-white/90 px-1.5 py-0.5 text-[10px] shadow hover:bg-white">Copy URL</button>
                <button onClick={() => onSelect?.(m)} className="group block w-full text-left">
                  <div className="aspect-square overflow-hidden rounded border border-black/10 bg-[linear-gradient(45deg,#eee_25%,transparent_25%,transparent_75%,#eee_75%),linear-gradient(45deg,#eee_25%,transparent_25%,transparent_75%,#eee_75%)] bg-[length:16px_16px] bg-[position:0_0,8px_8px] group-hover:border-brand">
                    <img src={m.url} alt={m.alt ?? ""} loading="lazy" className="h-full w-full object-contain" />
                  </div>
                  <div className="mt-1 truncate text-xs" title={m.filename}>{m.filename}</div>
                  <div className="text-[10px] text-black/40">{m.width && m.height ? `${m.width}×${m.height} · ` : ""}{(m.bytes / 1024).toFixed(0)} KB</div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>
      {canva && <CanvaPanel onImported={load} onClose={() => setCanva(false)} />}
    </div>
  );
}
