"use client";
import { useEffect, useRef, useState } from "react";

export type Cropped = { url: string; width: number; height: number };
type Edge = "t" | "b" | "l" | "r" | "tl" | "tr" | "bl" | "br";

/** Crop an image by dragging its four edges in (for trimming Canva blocks). Saves the result to the media library as a JPEG, max 1200px wide.
 *  onWhole present = show "Add whole image"; it still goes through the same JPEG step (via onDone) so emails don't carry multi-MB PNGs. */
export function TrimCropper({ url, onDone, onWhole, onCancel, onSkip, allowAgain, progress, doneLabel = "Add cropped" }: {
  url: string; onDone: (c: Cropped, again?: boolean) => void; onWhole?: () => void; onCancel: () => void;
  /** Skip this image and move to the next one in the queue. */ onSkip?: () => void;
  /** Show "Add & crop again": adds the crop but keeps this image open, to cut several pieces out of one page. */ allowAgain?: boolean;
  /** e.g. "Page 2 of 6" */ progress?: string; doneLabel?: string;
}) {
  const [added, setAdded] = useState(0);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const [crop, setC] = useState({ t: 0, b: 1, l: 0, r: 1 }); // fractions of the image
  const c = crop;
  const box = useRef<HTMLDivElement>(null); const drag = useRef<Edge | null>(null);

  useEffect(() => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => setImg(i); i.onerror = () => setErr("Couldn't load the image to crop."); i.src = url + (url.includes("?") ? "&" : "?") + "crop=1"; }, [url]);

  const move = (e: React.PointerEvent) => {
    if (!drag.current || !box.current) return;
    const r = box.current.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    const d = drag.current;
    setC(p => ({
      t: d.includes("t") ? Math.min(y, p.b - 0.03) : p.t, b: d.includes("b") ? Math.max(y, p.t + 0.03) : p.b,
      l: d.includes("l") ? Math.min(x, p.r - 0.03) : p.l, r: d.includes("r") ? Math.max(x, p.l + 0.03) : p.r,
    }));
  };
  const start = (edge: Edge) => (e: React.PointerEvent) => { drag.current = edge; (e.target as Element).setPointerCapture(e.pointerId); e.preventDefault(); };

  const finish = async (whole = false, again = false) => {
    if (!img) return; setBusy(true); setErr("");
    const c = whole ? { t: 0, b: 1, l: 0, r: 1 } : crop;
    try {
      const sx = c.l * img.naturalWidth, sy = c.t * img.naturalHeight, sw = (c.r - c.l) * img.naturalWidth, sh = (c.b - c.t) * img.naturalHeight;
      const k = Math.min(1, 1200 / sw); const ow = Math.round(sw * k), oh = Math.round(sh * k);
      const cv = document.createElement("canvas"); cv.width = ow; cv.height = oh;
      const g = cv.getContext("2d")!; g.fillStyle = "#ffffff"; g.fillRect(0, 0, ow, oh); g.drawImage(img, sx, sy, sw, sh, 0, 0, ow, oh);
      const blob: Blob = await new Promise((res, rej) => cv.toBlob(b => b ? res(b) : rej(new Error("crop failed")), "image/jpeg", 0.92));
      const fd = new FormData(); fd.append("files", new File([blob], `crop-${Date.now()}.jpg`, { type: "image/jpeg" })); fd.append("folder", "crops");
      const r = await fetch("/api/media", { method: "POST", body: fd }); const j = await r.json();
      if (!r.ok || !j.items?.[0]) throw new Error(j.error ?? "Upload failed");
      onDone({ url: j.items[0].url, width: j.items[0].width ?? ow, height: j.items[0].height ?? oh }, again);
      if (again) { setBusy(false); setAdded(n => n + 1); }
    } catch (e) { setErr((e as Error).message); setBusy(false); }
  };

  const vw = typeof window === "undefined" ? 1200 : window.innerWidth, vh = typeof window === "undefined" ? 800 : window.innerHeight;
  // Fill the width (up to 760px) and let tall images scroll inside the box, so they aren't shrunk to a sliver.
  const maxW = Math.min(760, vw - 120), maxH = Math.round(vh * 0.8);
  const k = img ? Math.min(maxW / img.naturalWidth, Math.max(maxH / img.naturalHeight, Math.min(maxW, 640) / img.naturalWidth)) : 1;
  const dw = img ? Math.round(img.naturalWidth * k) : 440, dh = img ? Math.round(img.naturalHeight * k) : 300;
  const pct = (n: number) => `${n * 100}%`;
  const keepW = img ? Math.round((c.r - c.l) * img.naturalWidth) : 0, keepH = img ? Math.round((c.b - c.t) * img.naturalHeight) : 0;
  const dim = "absolute bg-black/55 pointer-events-none";
  const pill = "absolute rounded-full bg-white shadow ring-1 ring-brand";
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="flex max-h-[96vh] flex-col rounded-xl bg-white p-5 shadow-xl">
        <div className="flex items-baseline gap-3"><h2 className="text-lg font-semibold">Crop</h2>{progress && <span className="rounded bg-black/5 px-2 py-0.5 text-xs">{progress}</span>}<span className="text-sm text-black/60">Drag the white handles. The bright area is what you keep.</span><div className="flex-1" />{img && <span className="text-xs tabular-nums text-black/50">{keepW} × {keepH}px</span>}</div>
        {!img ? <div className="p-10 text-sm text-black/50">{err || "Loading…"}</div> : (
          <div className="mt-2 min-h-0 flex-1 overflow-auto p-3">
          <div ref={box} onPointerMove={move} onPointerUp={() => { drag.current = null; }} style={{ width: dw, height: dh }} className="relative mx-auto select-none bg-black/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.src} alt="" draggable={false} style={{ width: dw, height: dh }} className="block" />
            <div className={`${dim} inset-x-0 top-0`} style={{ height: pct(c.t) }} />
            <div className={`${dim} inset-x-0 bottom-0`} style={{ height: pct(1 - c.b) }} />
            <div className={`${dim} left-0`} style={{ top: pct(c.t), height: pct(c.b - c.t), width: pct(c.l) }} />
            <div className={`${dim} right-0`} style={{ top: pct(c.t), height: pct(c.b - c.t), width: pct(1 - c.r) }} />
            {/* hairline exactly on the crop boundary */}
            <div className="pointer-events-none absolute" style={{ top: pct(c.t), left: pct(c.l), width: pct(c.r - c.l), height: pct(c.b - c.t), boxShadow: "0 0 0 1px #fff, 0 0 0 2px rgba(0,0,0,.5)" }} />
            {/* edge grab zones (invisible, 20px) with a small pill */}
            <div onPointerDown={start("t")} className="absolute z-10 h-5 cursor-ns-resize touch-none" style={{ top: `calc(${pct(c.t)} - 10px)`, left: pct(c.l), width: pct(c.r - c.l) }}><div className={`${pill} left-1/2 top-1/2 h-1.5 w-10 -translate-x-1/2 -translate-y-1/2`} /></div>
            <div onPointerDown={start("b")} className="absolute z-10 h-5 cursor-ns-resize touch-none" style={{ top: `calc(${pct(c.b)} - 10px)`, left: pct(c.l), width: pct(c.r - c.l) }}><div className={`${pill} left-1/2 top-1/2 h-1.5 w-10 -translate-x-1/2 -translate-y-1/2`} /></div>
            <div onPointerDown={start("l")} className="absolute z-10 w-5 cursor-ew-resize touch-none" style={{ left: `calc(${pct(c.l)} - 10px)`, top: pct(c.t), height: pct(c.b - c.t) }}><div className={`${pill} left-1/2 top-1/2 h-10 w-1.5 -translate-x-1/2 -translate-y-1/2`} /></div>
            <div onPointerDown={start("r")} className="absolute z-10 w-5 cursor-ew-resize touch-none" style={{ left: `calc(${pct(c.r)} - 10px)`, top: pct(c.t), height: pct(c.b - c.t) }}><div className={`${pill} left-1/2 top-1/2 h-10 w-1.5 -translate-x-1/2 -translate-y-1/2`} /></div>
            {/* corners */}
            {(["tl", "tr", "bl", "br"] as const).map(k2 => <div key={k2} onPointerDown={start(k2)} className={`absolute z-20 h-5 w-5 touch-none ${k2 === "tl" || k2 === "br" ? "cursor-nwse-resize" : "cursor-nesw-resize"}`} style={{ top: `calc(${pct(k2[0] === "t" ? c.t : c.b)} - 10px)`, left: `calc(${pct(k2[1] === "l" ? c.l : c.r)} - 10px)` }}><div className={`${pill} left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2`} /></div>)}
          </div></div>)}
        {err && img && <p className="mt-2 text-sm text-red-700">{err}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button disabled={!img || busy} onClick={() => finish()} className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? "Saving…" : doneLabel}</button>
          {allowAgain && <button disabled={!img || busy} onClick={() => finish(false, true)} title="Adds this crop and keeps the page open so you can cut out another piece" className="rounded-md border border-brand px-4 py-2 text-sm font-medium text-brand disabled:opacity-50">Add &amp; crop again</button>}
          {onWhole && <button disabled={busy} onClick={() => img ? finish(true) : onWhole()} className="rounded-md border border-black/15 px-4 py-2 text-sm hover:border-black/40">Add whole image</button>}
          <button disabled={busy} onClick={() => setC({ t: 0, b: 1, l: 0, r: 1 })} className="text-sm text-black/50 hover:text-black">Reset</button>
          <div className="flex-1" />
          {added > 0 && <span className="text-xs text-green-700">✓ {added} added from this page</span>}
          {onSkip && <button disabled={busy} onClick={onSkip} className="rounded-md border border-black/15 px-3 py-2 text-sm hover:border-black/40">{added > 0 ? "Next page" : "Skip this page"}</button>}
          <button disabled={busy} onClick={onCancel} className="text-sm text-black/50 hover:text-black">{onSkip ? "Stop" : "Cancel"}</button>
        </div>
      </div>
    </div>
  );
}
