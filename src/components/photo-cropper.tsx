"use client";
import { useEffect, useRef, useState } from "react";

/** In-browser crop / zoom / pan. Exports a resized JPEG (max 1600px wide) so uploads stay small. */
const ASPECTS: [string, number | null][] = [["Free", null], ["16:9", 16 / 9], ["3:2", 3 / 2], ["4:3", 4 / 3], ["1:1", 1], ["4:5", 4 / 5]];

export function PhotoCropper({ file, onDone, onCancel }: { file: File; onDone: (blob: Blob, w: number, h: number) => void; onCancel: () => void }) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [aspect, setAspect] = useState<number | null>(16 / 9);
  const [zoom, setZoom] = useState(1); const [off, setOff] = useState({ x: 0, y: 0 });
  const box = useRef<HTMLDivElement>(null); const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const W = 300;

  useEffect(() => { const u = URL.createObjectURL(file); const i = new Image(); i.onload = () => setImg(i); i.src = u; return () => URL.revokeObjectURL(u); }, [file]);
  useEffect(() => { setZoom(1); setOff({ x: 0, y: 0 }); }, [aspect]);
  if (!img) return <div className="p-4 text-xs text-black/50">Loading…</div>;

  const ar = aspect ?? img.width / img.height;
  const H = Math.round(W / ar);
  const base = Math.max(W / img.width, H / img.height); // cover
  const s = base * zoom; const dw = img.width * s, dh = img.height * s;
  const clamp = (o: { x: number; y: number }) => ({ x: Math.min(0, Math.max(W - dw, o.x)), y: Math.min(0, Math.max(H - dh, o.y)) });
  const o = clamp(off);

  const finish = () => {
    const scale = Math.min(1, 1600 / (W / s)); // output px per source px, capped at 1600 wide
    const sw = W / s, sh = H / s, sx = -o.x / s, sy = -o.y / s;
    const ow = Math.round(sw * scale), oh = Math.round(sh * scale);
    const c = document.createElement("canvas"); c.width = ow; c.height = oh;
    c.getContext("2d")!.drawImage(img, sx, sy, sw, sh, 0, 0, ow, oh);
    c.toBlob(b => b && onDone(b, ow, oh), "image/jpeg", 0.86);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1 text-xs">{ASPECTS.map(([l, v]) => <button key={l} onClick={() => setAspect(v)} className={`rounded border px-2 py-0.5 ${aspect === v ? "border-brand text-brand" : "border-black/15"}`}>{l}</button>)}</div>
      <div ref={box} style={{ width: W, height: H }} className="relative cursor-grab touch-none overflow-hidden rounded bg-black/5 select-none"
        onPointerDown={e => { drag.current = { x: e.clientX, y: e.clientY, ox: o.x, oy: o.y }; (e.target as Element).setPointerCapture(e.pointerId); }}
        onPointerMove={e => { if (drag.current) setOff(clamp({ x: drag.current.ox + e.clientX - drag.current.x, y: drag.current.oy + e.clientY - drag.current.y })); }}
        onPointerUp={() => { drag.current = null; }}>
        <img src={img.src} alt="" draggable={false} style={{ position: "absolute", left: o.x, top: o.y, width: dw, height: dh, maxWidth: "none" }} />
      </div>
      <div className="flex items-center gap-2 text-xs"><span>Zoom</span><input type="range" min={1} max={3} step={0.01} value={zoom} onChange={e => setZoom(Number(e.target.value))} className="flex-1" /></div>
      <p className="text-xs text-black/50">Drag to reposition. Output is resized to max 1600px wide.</p>
      <div className="flex gap-2"><button onClick={finish} className="rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white">Use this crop</button><button onClick={onCancel} className="rounded-md border border-black/15 px-3 py-1.5 text-xs">Cancel</button></div>
    </div>
  );
}
