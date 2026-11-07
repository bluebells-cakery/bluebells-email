"use client";
import { useEffect, useRef, useState } from "react";

const PATH = "M34.875 2.71875C38.0415 -0.239566 42.9585 -0.239566 46.125 2.71875C48.3739 4.81975 51.5214 5.66288 54.5195 4.96777C58.7408 3.98922 62.9986 6.44776 64.2617 10.5928C65.1588 13.5368 67.4632 15.8412 70.4072 16.7383C74.5522 18.0014 77.0108 22.2592 76.0322 26.4805C75.3371 29.4786 76.1803 32.6261 78.2812 34.875C81.2396 38.0415 81.2396 42.9585 78.2812 46.125C76.1803 48.3739 75.3371 51.5214 76.0322 54.5195C77.0108 58.7408 74.5522 62.9986 70.4072 64.2617C67.4632 65.1588 65.1588 67.4632 64.2617 70.4072C62.9986 74.5522 58.7408 77.0108 54.5195 76.0322C51.5214 75.3371 48.3739 76.1803 46.125 78.2812C42.9585 81.2396 38.0415 81.2396 34.875 78.2812C32.6261 76.1803 29.4786 75.3371 26.4805 76.0322C22.2592 77.0108 18.0014 74.5522 16.7383 70.4072C15.8412 67.4632 13.5368 65.1588 10.5928 64.2617C6.44776 62.9986 3.98922 58.7408 4.96777 54.5195C5.66288 51.5214 4.81975 48.3739 2.71875 46.125C-0.239566 42.9585 -0.239566 38.0415 2.71875 34.875C4.81975 32.6261 5.66288 29.4786 4.96777 26.4805C3.98922 22.2592 6.44776 18.0014 10.5928 16.7383C13.5368 15.8412 15.8412 13.5368 16.7383 10.5928C18.0014 6.44776 22.2592 3.98922 26.4805 4.96777C29.4786 5.66288 32.6261 4.81975 34.875 2.71875Z";
const SWATCHES = ["#fcd1bd", "#fbe7e6", "#fff9ea", "#e4c5e0", "#c0e6ef", "#262967", "#ffffff"];

export function WavyCircle() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [fill, setFill] = useState("#fcd1bd");
  const [outline, setOutline] = useState("#262967");
  const [showOutline, setShowOutline] = useState(true);
  const [text, setText] = useState("Best\nSeller");
  const [textColour, setTextColour] = useState("#262967");
  const [font, setFont] = useState<"Poppins" | "Crimson Pro">("Poppins");
  const [weight, setWeight] = useState(600);
  const [textSize, setTextSize] = useState(22);
  const [rotate, setRotate] = useState(-8);
  const [size, setSize] = useState(600);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const c = canvas.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    const S = size; c.width = S; c.height = S;
    ctx.clearRect(0, 0, S, S);
    const pad = S * 0.06, scale = (S - pad * 2) / 81;
    ctx.save();
    ctx.translate(S / 2, S / 2); ctx.rotate((rotate * Math.PI) / 180); ctx.translate(-S / 2, -S / 2);
    ctx.translate(pad, pad); ctx.scale(scale, scale);
    const p = new Path2D(PATH);
    ctx.fillStyle = fill; ctx.fill(p);
    if (showOutline) { ctx.lineWidth = 1; ctx.strokeStyle = outline; ctx.stroke(p); }
    ctx.restore();
    // text (not rotated with the badge — keeps it readable; rotate slightly for charm)
    ctx.save();
    ctx.translate(S / 2, S / 2); ctx.rotate((rotate * Math.PI) / 180);
    ctx.fillStyle = textColour; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const px = (textSize / 100) * S;
    ctx.font = `${weight} ${px}px "${font}"`;
    const lines = text.split("\n").filter(Boolean);
    const lh = px * 1.05;
    lines.forEach((l, i) => ctx.fillText(l, 0, (i - (lines.length - 1) / 2) * lh));
    ctx.restore();
  }, [fill, outline, showOutline, text, textColour, font, weight, textSize, rotate, size]);

  const save = async () => {
    const c = canvas.current; if (!c) return;
    setBusy(true);
    const blob: Blob = await new Promise(r => c.toBlob(b => r(b!), "image/png"));
    const fd = new FormData(); fd.append("folder", "brand elements");
    fd.append("files", new File([blob], `wavy-circle-${text.replace(/\s+/g, "-").toLowerCase() || "blank"}-${fill.slice(1)}.png`, { type: "image/png" }));
    const r = await fetch("/api/media", { method: "POST", body: fd });
    setBusy(false); if (r.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
  };

  const Pick = ({ v, set, label }: { v: string; set: (s: string) => void; label: string }) => (
    <label className="flex items-center gap-2 text-sm">{label} <input type="color" value={v} onChange={e => set(e.target.value)} />
      <span className="flex gap-1">{SWATCHES.map(c => <button key={c} onClick={() => set(c)} className="h-5 w-5 rounded border border-black/10" style={{ background: c }} />)}</span></label>
  );

  return (
    <div className="mt-6 rounded-lg border border-black/10 bg-white p-5">
      <div className="font-medium">Wavy circle badge</div>
      <div className="mt-4 grid gap-6 md:grid-cols-[1fr_auto]">
        <div className="space-y-3">
          <Pick v={fill} set={setFill} label="Fill" />
          <div className="flex items-center gap-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showOutline} onChange={e => setShowOutline(e.target.checked)} /> Outline</label>{showOutline && <Pick v={outline} set={setOutline} label="" />}</div>
          <Pick v={textColour} set={setTextColour} label="Text" />
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <textarea value={text} onChange={e => setText(e.target.value)} rows={2} placeholder="Text (optional)" className="w-40 rounded border border-black/10 px-2 py-1" />
            <select value={font} onChange={e => setFont(e.target.value as never)} className="rounded border border-black/10 px-2 py-1"><option>Poppins</option><option>Crimson Pro</option></select>
            <select value={weight} onChange={e => setWeight(Number(e.target.value))} className="rounded border border-black/10 px-2 py-1"><option value={400}>Regular</option><option value={600}>Semibold</option><option value={700}>Bold</option></select>
            <label>Size <input type="range" min={8} max={40} value={textSize} onChange={e => setTextSize(Number(e.target.value))} /></label>
            <label>Tilt <input type="range" min={-30} max={30} value={rotate} onChange={e => setRotate(Number(e.target.value))} /> {rotate}°</label>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <label>Export <select value={size} onChange={e => setSize(Number(e.target.value))} className="rounded border border-black/10 px-2 py-1"><option value={300}>300px</option><option value={600}>600px</option><option value={1000}>1000px</option></select></label>
            <button disabled={busy} onClick={save} className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">{busy ? "Saving…" : saved ? "Saved to media" : "Save to media (PNG, transparent)"}</button>
          </div>
        </div>
        <div className="flex items-center justify-center rounded bg-[linear-gradient(45deg,#eee_25%,transparent_25%,transparent_75%,#eee_75%),linear-gradient(45deg,#eee_25%,transparent_25%,transparent_75%,#eee_75%)] bg-[length:16px_16px] bg-[position:0_0,8px_8px] p-4">
          <canvas ref={canvas} style={{ width: 220, height: 220 }} />
        </div>
      </div>
    </div>
  );
}
