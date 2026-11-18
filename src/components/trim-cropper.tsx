"use client";
import { useEffect, useRef, useState } from "react";

export type Cropped = { url: string; width: number; height: number };
type Edge = "t" | "b" | "l" | "r";

/** Crop an image by dragging its four edges in (for trimming Canva blocks). Saves the result to the media library as a JPEG, max 1200px wide. */
export function TrimCropper({ url, onDone, onWhole, onCancel }: { url: string; onDone: (c: Cropped) => void; onWhole: () => void; onCancel: () => void }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const [c, setC] = useState({ t: 0, b: 1, l: 0, r: 1 }); // fractions of the image
  const box = useRef<HTMLDivElement>(null); const drag = useRef<Edge | null>(null);

  useEffect(() => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => setImg(i); i.onerror = () => setErr("Couldn't load the image to crop."); i.src = url + (url.includes("?") ? "&" : "?") + "crop=1"; }, [url]);

  const move = (e: React.PointerEvent) => {
    if (!drag.current || !box.current) return;
    const r = box.current.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    setC(p => drag.current === "t" ? { ...p, t: Math.min(y, p.b - 0.03) } : drag.current === "b" ? { ...p, b: Math.max(y, p.t + 0.03) } : drag.current === "l" ? { ...p, l: Math.min(x, p.r - 0.03) } : { ...p, r: Math.max(x, p.l + 0.03) });
  };
  const start = (edge: Edge) => (e: React.PointerEvent) => { drag.current = edge; (e.target as Element).setPointerCapture(e.pointerId); e.preventDefault(); };

  const finish = async () => {
    if (!img) return; setBusy(true); setErr("");
    try {
      const sx = c.l * img.naturalWidth, sy = c.t * img.naturalHeight, sw = (c.r - c.l) * img.naturalWidth, sh = (c.b - c.t) * img.naturalHeight;
      const k = Math.min(1, 1200 / sw); const ow = Math.round(sw * k), oh = Math.round(sh * k);
      const cv = document.createElement("canvas"); cv.width = ow; cv.height = oh;
      const g = cv.getContext("2d")!; g.fillStyle = "#ffffff"; g.fillRect(0, 0, ow, oh); g.drawImage(img, sx, sy, sw, sh, 0, 0, ow, oh);
      const blob: Blob = await new Promise((res, rej) => cv.toBlob(b => b ? res(b) : rej(new Error("crop failed")), "image/jpeg", 0.92));
      const fd = new FormData(); fd.append("files", new File([blob], `crop-${Date.now()}.jpg`, { type: "image/jpeg" })); fd.append("folder", "canva");
      const r = await fetch("/api/media", { method: "POST", body: fd }); const j = await r.json();
      if (!r.ok || !j.items?.[0]) throw new Error(j.error ?? "Upload failed");
      onDone({ url: j.items[0].url, width: j.items[0].width ?? ow, height: j.items[0].height ?? oh });
    } catch (e) { setErr((e as Error).message); setBusy(false); }
  };

  const maxH = typeof window === "undefined" ? 520 : Math.round(window.innerHeight * 0.62);
  const dw = img ? Math.min(440, (maxH * img.naturalWidth) / img.naturalHeight) : 440, dh = img ? (dw * img.naturalHeight) / img.naturalWidth : 300;
  const pct = (n: number) => `${n * 100}%`;
  const bar = "absolute z-10 bg-brand touch-none";
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="max-h-full overflow-auto rounded-xl bg-white p-5 shadow-xl">
        <div className="flex items-baseline gap-3"><h2 className="text-lg font-semibold">Crop</h2><span className="text-sm text-black/60">Drag the blue edges in to trim.</span></div>
        {!img ? <div className="p-10 text-sm text-black/50">{err || "Loading…"}</div> : (
          <div ref={box} onPointerMove={move} onPointerUp={() => { drag.current = null; }} style={{ width: dw, height: dh }} className="relative mt-3 select-none overflow-hidden rounded bg-black/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.src} alt="" draggable={false} style={{ width: dw, height: dh }} className="block" />
            <div className="absolute inset-x-0 top-0 bg-white/75" style={{ height: pct(c.t) }} />
            <div className="absolute inset-x-0 bottom-0 bg-white/75" style={{ height: pct(1 - c.b) }} />
            <div className="absolute left-0 bg-white/75" style={{ top: pct(c.t), height: pct(c.b - c.t), width: pct(c.l) }} />
            <div className="absolute right-0 bg-white/75" style={{ top: pct(c.t), height: pct(c.b - c.t), width: pct(1 - c.r) }} />
            <div onPointerDown={start("t")} className={`${bar} h-2 cursor-ns-resize`} style={{ top: `calc(${pct(c.t)} - 0px)`, left: pct(c.l), width: pct(c.r - c.l) }} />
            <div onPointerDown={start("b")} className={`${bar} h-2 cursor-ns-resize`} style={{ top: `calc(${pct(c.b)} - 8px)`, left: pct(c.l), width: pct(c.r - c.l) }} />
            <div onPointerDown={start("l")} className={`${bar} w-2 cursor-ew-resize`} style={{ left: `calc(${pct(c.l)} - 0px)`, top: pct(c.t), height: pct(c.b - c.t) }} />
            <div onPointerDown={start("r")} className={`${bar} w-2 cursor-ew-resize`} style={{ left: `calc(${pct(c.r)} - 8px)`, top: pct(c.t), height: pct(c.b - c.t) }} />
          </div>)}
        {err && img && <p className="mt-2 text-sm text-red-700">{err}</p>}
        <div className="mt-4 flex items-center gap-2">
          <button disabled={!img || busy} onClick={finish} className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? "Saving…" : "Add cropped"}</button>
          <button disabled={busy} onClick={onWhole} className="rounded-md border border-black/15 px-4 py-2 text-sm hover:border-black/40">Add whole image</button>
          <button disabled={busy} onClick={() => setC({ t: 0, b: 1, l: 0, r: 1 })} className="text-sm text-black/50 hover:text-black">Reset</button>
          <div className="flex-1" />
          <button disabled={busy} onClick={onCancel} className="text-sm text-black/50 hover:text-black">Cancel</button>
        </div>
      </div>
    </div>
  );
}
