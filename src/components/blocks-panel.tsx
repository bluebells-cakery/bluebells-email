"use client";
import { useState } from "react";
import { MediaLibrary, type MediaItem } from "@/components/media-library";
import { brand } from "@/lib/brand";
import { waveRow, productRow, imageRow, roundedImageRow, footerRow, type Product } from "@/lib/blocks";

type Row = Record<string, unknown>;
const SW = ["#fbe7e6", "#fcd1bd", "#fff9ea", "#e4c5e0", "#c0e6ef", "#262967", "#fffdf8", "#ffffff"];
const Pick = ({ v, set, label }: { v: string; set: (s: string) => void; label: string }) => (
  <label className="flex items-center gap-2 text-xs">{label} <input type="color" value={v} onChange={e => set(e.target.value)} />
    <span className="flex gap-1">{SW.map(c => <button key={c} onClick={() => set(c)} className="h-4 w-4 rounded border border-black/10" style={{ background: c }} />)}</span></label>
);

export function BlocksPanel({ onInsert, onClose }: { onInsert: (rows: Row[]) => void; onClose: () => void }) {
  const [tab, setTab] = useState<"wave" | "product" | "image" | "footer">("wave");
  const [waveFill, setWaveFill] = useState("#fbe7e6"); const [waveBg, setWaveBg] = useState("#fffdf8");
  const [flip, setFlip] = useState(false);
  const [q, setQ] = useState(""); const [results, setResults] = useState<Product[]>([]); const [picked, setPicked] = useState<Product[]>([]);
  const [cardBg, setCardBg] = useState("#ffffff"); const [rowBg, setRowBg] = useState("#fffdf8"); const [btn, setBtn] = useState("Order now");
  const [rounded, setRounded] = useState(false); const [radius, setRadius] = useState(16);
  const [busy, setBusy] = useState(false);

  const waveSvg = (w: number, h: number) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 1158 40" preserveAspectRatio="none"><rect width="1158" height="40" fill="${waveBg}"/><g transform="${flip ? "translate(0,40) scale(1,-1) " : ""}translate(0,40) scale(0.1,-0.1)" fill="${waveFill}"><path d="${brand.wavePath}"/></g></svg>`;

  const insertWave = async () => {
    setBusy(true);
    const r = await fetch("/api/brand/save", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ svg: waveSvg(1200, 41), filename: `wave-${waveFill.slice(1)}-on-${waveBg.slice(1)}${flip ? "-flipped" : ""}`, width: 1200 }) });
    const m = await r.json(); setBusy(false);
    onInsert([waveRow(m.url, 1200, 41, flip ? waveFill : waveBg)]);
  };
  const search = async (s: string) => { setQ(s); if (s.length < 2) return setResults([]); const r = await fetch(`/api/products/search?q=${encodeURIComponent(s)}`); setResults((await r.json()).products); };

  return (
    <div className="flex h-full w-[420px] flex-col border-l border-black/10 bg-white">
      <div className="flex items-center gap-1 border-b border-black/10 px-3 py-2">
        {([["wave", "Wave"], ["product", "Products"], ["image", "Image / badge"], ["footer", "Footer"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded px-2 py-1 text-xs font-medium ${tab === k ? "bg-brand/10 text-brand" : "text-black/60 hover:bg-black/5"}`}>{l}</button>
        ))}
        <div className="flex-1" /><button onClick={onClose} className="text-xs text-black/50 hover:text-black">Close</button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3 text-sm">
        {tab === "wave" && (<div className="space-y-3">
          <Pick v={waveFill} set={setWaveFill} label="Wave" /><Pick v={waveBg} set={setWaveBg} label="Behind" />
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={flip} onChange={e => setFlip(e.target.checked)} /> Flip (wave at the bottom of a section)</label>
          <div className="overflow-hidden rounded border border-black/10" dangerouslySetInnerHTML={{ __html: waveSvg(1158, 50).replace('width="1158" height="50"', 'width="100%" height="50"') }} />
          <p className="text-xs text-black/50">Place after a section whose background is the “Wave” colour (or before it when flipped).</p>
          <button disabled={busy} onClick={insertWave} className="rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">{busy ? "Rendering…" : "Insert wave"}</button>
        </div>)}
        {tab === "product" && (<div className="space-y-3">
          <input value={q} onChange={e => search(e.target.value)} placeholder="Search products…" className="w-full rounded border border-black/10 px-2 py-1.5" />
          {results.length > 0 && <ul className="max-h-56 overflow-y-auto rounded border border-black/10">{results.map(p => (
            <li key={p.url}><button onClick={() => { if (picked.length < 3 && !picked.find(x => x.url === p.url)) setPicked([...picked, p]); }} className="flex w-full items-center gap-2 px-2 py-1.5 text-left hover:bg-black/5">
              {p.image && <img src={p.image} alt="" className="h-8 w-8 rounded object-cover" />}<span className="flex-1 truncate">{p.title}</span><span className="text-xs text-black/50">${p.price}</span></button></li>))}</ul>}
          <div className="text-xs text-black/60">Selected ({picked.length}/3):</div>
          <ul className="space-y-1">{picked.map(p => <li key={p.url} className="flex items-center gap-2 rounded bg-black/5 px-2 py-1 text-xs"><span className="flex-1 truncate">{p.title}</span><button onClick={() => setPicked(picked.filter(x => x !== p))} className="text-black/50">✕</button></li>)}</ul>
          <input value={btn} onChange={e => setBtn(e.target.value)} className="w-full rounded border border-black/10 px-2 py-1 text-xs" placeholder="Button text" />
          <Pick v={cardBg} set={setCardBg} label="Card" /><Pick v={rowBg} set={setRowBg} label="Row" />
          <button disabled={!picked.length} onClick={() => { onInsert([productRow(picked, { cardBg, bg: rowBg, buttonText: btn })]); setPicked([]); }} className="rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">Insert {picked.length || ""} product card{picked.length === 1 ? "" : "s"}</button>
        </div>)}
        {tab === "image" && (<div className="flex h-[60vh] flex-col">
          <div className="mb-2 flex items-center gap-3 text-xs">
            <label className="flex items-center gap-1"><input type="radio" checked={!rounded} onChange={() => setRounded(false)} /> Badge / sticker</label>
            <label className="flex items-center gap-1"><input type="radio" checked={rounded} onChange={() => setRounded(true)} /> Photo with soft corners</label>
          </div>
          {rounded && <div className="mb-2 flex items-center gap-2 text-xs"><span>Corner radius</span><input type="range" min={4} max={40} value={radius} onChange={e => setRadius(Number(e.target.value))} className="flex-1" /><span className="w-10 text-right">{radius}px</span>
            <div className="h-8 w-12 bg-brand/60" style={{ borderRadius: radius / 2 }} /></div>}
          <p className="mb-2 text-xs text-black/50">{rounded ? "Pick a photo — inserted full-width with rounded corners (Outlook desktop shows square corners)." : "Pick a badge/sticker/image from the library — it's inserted as a centred row (make badges on the Brand page first)."}</p>
          <div className="min-h-0 flex-1 overflow-hidden rounded border border-black/10"><MediaLibrary compact onSelect={(m: MediaItem) => onInsert([rounded
            ? roundedImageRow(m.url, m.width ?? 600, m.height ?? 600, { radius })
            : imageRow(m.url, m.width ?? 600, m.height ?? 600, { maxWidth: Math.min(m.width ?? 600, 300) })])} /></div>
        </div>)}
        {tab === "footer" && (<div className="space-y-3">
          <p className="text-xs text-black/60">Standard footer with the three stores, website link, unsubscribe link and business address (required for compliance).</p>
          <button onClick={() => onInsert([footerRow()])} className="rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white">Insert footer</button>
        </div>)}
      </div>
    </div>
  );
}
