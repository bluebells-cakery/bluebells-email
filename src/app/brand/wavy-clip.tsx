"use client";
import { useEffect, useRef, useState } from "react";
import { MediaLibrary, type MediaItem } from "@/components/media-library";

const PATH = "M34.875 2.71875C38.0415 -0.239566 42.9585 -0.239566 46.125 2.71875C48.3739 4.81975 51.5214 5.66288 54.5195 4.96777C58.7408 3.98922 62.9986 6.44776 64.2617 10.5928C65.1588 13.5368 67.4632 15.8412 70.4072 16.7383C74.5522 18.0014 77.0108 22.2592 76.0322 26.4805C75.3371 29.4786 76.1803 32.6261 78.2812 34.875C81.2396 38.0415 81.2396 42.9585 78.2812 46.125C76.1803 48.3739 75.3371 51.5214 76.0322 54.5195C77.0108 58.7408 74.5522 62.9986 70.4072 64.2617C67.4632 65.1588 65.1588 67.4632 64.2617 70.4072C62.9986 74.5522 58.7408 77.0108 54.5195 76.0322C51.5214 75.3371 48.3739 76.1803 46.125 78.2812C42.9585 81.2396 38.0415 81.2396 34.875 78.2812C32.6261 76.1803 29.4786 75.3371 26.4805 76.0322C22.2592 77.0108 18.0014 74.5522 16.7383 70.4072C15.8412 67.4632 13.5368 65.1588 10.5928 64.2617C6.44776 62.9986 3.98922 58.7408 4.96777 54.5195C5.66288 51.5214 4.81975 48.3739 2.71875 46.125C-0.239566 42.9585 -0.239566 38.0415 2.71875 34.875C4.81975 32.6261 5.66288 29.4786 4.96777 26.4805C3.98922 22.2592 6.44776 18.0014 10.5928 16.7383C13.5368 15.8412 15.8412 13.5368 16.7383 10.5928C18.0014 6.44776 22.2592 3.98922 26.4805 4.96777C29.4786 5.66288 32.6261 4.81975 34.875 2.71875Z";
const SW = ["#262967", "#fcd1bd", "#fbe7e6", "#fff9ea", "#e4c5e0", "#c0e6ef", "#00bfb3", "#ffffff"];

export function WavyClip() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [pick, setPick] = useState(false);
  const [zoom, setZoom] = useState(1); const [ox, setOx] = useState(0); const [oy, setOy] = useState(0);
  const [outline, setOutline] = useState(true); const [outlineColour, setOutlineColour] = useState("#262967"); const [outlineW, setOutlineW] = useState(1.5);
  const [rotate, setRotate] = useState(0);
  const [size, setSize] = useState(800);
  const [busy, setBusy] = useState(false); const [saved, setSaved] = useState(false);

  const choose = (m: MediaItem) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => setImg(i); i.src = m.url; setPick(false); };

  useEffect(() => {
    const c = canvas.current; if (!c) return;
    const ctx = c.getContext("2d")!; const S = size; c.width = S; c.height = S; ctx.clearRect(0, 0, S, S);
    const pad = S * 0.04, scale = (S - pad * 2) / 81;
    const p = new Path2D(PATH);
    ctx.save();
    ctx.translate(S / 2, S / 2); ctx.rotate((rotate * Math.PI) / 180); ctx.translate(-S / 2, -S / 2);
    ctx.translate(pad, pad); ctx.scale(scale, scale);
    ctx.clip(p);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (img) {
      const base = Math.max(S / img.width, S / img.height) * zoom;
      const w = img.width * base, h = img.height * base;
      ctx.drawImage(img, (S - w) / 2 + (ox / 100) * S, (S - h) / 2 + (oy / 100) * S, w, h);
    } else { ctx.fillStyle = "#f1f1f1"; ctx.fillRect(0, 0, S, S); }
    ctx.restore();
    if (outline) {
      ctx.save();
      ctx.translate(S / 2, S / 2); ctx.rotate((rotate * Math.PI) / 180); ctx.translate(-S / 2, -S / 2);
      ctx.translate(pad, pad); ctx.scale(scale, scale);
      ctx.lineWidth = outlineW; ctx.strokeStyle = outlineColour; ctx.stroke(p);
      ctx.restore();
    }
  }, [img, zoom, ox, oy, outline, outlineColour, outlineW, rotate, size]);

  const save = async () => {
    const c = canvas.current; if (!c || !img) return; setBusy(true);
    const blob: Blob = await new Promise(r => c.toBlob(b => r(b!), "image/png"));
    const fd = new FormData(); fd.append("folder", "brand elements"); fd.append("files", new File([blob], `wavy-photo-${Date.now()}.png`, { type: "image/png" }));
    const r = await fetch("/api/media", { method: "POST", body: fd }); setBusy(false);
    if (r.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
  };

  return (
    <div className="mt-6 rounded-lg border border-black/10 bg-white p-5">
      <div className="font-medium">Wavy circle photo</div>
      <p className="mt-1 text-xs text-black/50">Clip any photo from the media library into the wavy circle.</p>
      <div className="mt-4 grid gap-6 md:grid-cols-[1fr_auto]">
        <div className="space-y-3 text-sm">
          <button onClick={() => setPick(true)} className="rounded-md border border-black/15 px-3 py-1.5 text-sm hover:border-black/40">{img ? "Change photo" : "Choose photo…"}</button>
          <label className="block">Zoom <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={e => setZoom(Number(e.target.value))} className="w-56" /></label>
          <label className="block">Move ↔ <input type="range" min={-50} max={50} value={ox} onChange={e => setOx(Number(e.target.value))} className="w-56" /></label>
          <label className="block">Move ↕ <input type="range" min={-50} max={50} value={oy} onChange={e => setOy(Number(e.target.value))} className="w-56" /></label>
          <label className="block">Tilt <input type="range" min={-30} max={30} value={rotate} onChange={e => setRotate(Number(e.target.value))} className="w-56" /> {rotate}°</label>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2"><input type="checkbox" checked={outline} onChange={e => setOutline(e.target.checked)} /> Outline</label>
            {outline && (<>
              <input type="color" value={outlineColour} onChange={e => setOutlineColour(e.target.value)} />
              <span className="flex gap-1">{SW.map(c => <button key={c} onClick={() => setOutlineColour(c)} className="h-5 w-5 rounded border border-black/10" style={{ background: c }} />)}</span>
              <label>Width <input type="range" min={0.5} max={4} step={0.5} value={outlineW} onChange={e => setOutlineW(Number(e.target.value))} /></label>
            </>)}
          </div>
          <div className="flex items-center gap-3">
            <label>Export <select value={size} onChange={e => setSize(Number(e.target.value))} className="rounded border border-black/10 px-2 py-1"><option value={400}>400px</option><option value={800}>800px</option><option value={1200}>1200px</option></select></label>
            <button disabled={!img || busy} onClick={save} className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">{busy ? "Saving…" : saved ? "Saved to media" : "Save to media (PNG, transparent)"}</button>
          </div>
        </div>
        <div className="flex items-center justify-center rounded bg-[linear-gradient(45deg,#eee_25%,transparent_25%,transparent_75%,#eee_75%),linear-gradient(45deg,#eee_25%,transparent_25%,transparent_75%,#eee_75%)] bg-[length:16px_16px] bg-[position:0_0,8px_8px] p-4">
          <canvas ref={canvas} style={{ width: 260, height: 260 }} />
        </div>
      </div>
      {pick && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6" onClick={() => setPick(false)}>
          <div className="flex h-[85vh] w-[90vw] max-w-6xl flex-col overflow-hidden rounded-lg bg-background shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-black/10 bg-white px-4 py-2"><h2 className="font-medium">Choose a photo</h2><button onClick={() => setPick(false)} className="text-sm text-black/60">Close</button></div>
            <div className="min-h-0 flex-1"><MediaLibrary compact onSelect={choose} /></div>
          </div>
        </div>
      )}
    </div>
  );
}
