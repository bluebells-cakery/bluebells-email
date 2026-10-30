"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MediaLibrary, type MediaItem } from "@/components/media-library";
import type { FormConfig } from "@/lib/forms";

type F = { id: number; name: string; kind: string; status: string; config: FormConfig };
const SW = ["#fbe7e6", "#fcd1bd", "#fff9ea", "#e4c5e0", "#c0e6ef", "#fffdf8", "#262967", "#00bfb3", "#ffffff"];

export function FormEditor({ form, appUrl }: { form: F; appUrl: string }) {
  const r = useRouter();
  const [f, setF] = useState(form); const [saved, setSaved] = useState(""); const [pick, setPick] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const save = async (next: Partial<F>) => { const merged = { ...f, ...next }; setF(merged); setSaved("saving"); await fetch(`/api/forms/${f.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: merged.name, status: merged.status, config: merged.config }) }); setSaved("saved"); setTimeout(() => setSaved(""), 1200); };
  const set = (k: keyof FormConfig, v: unknown) => save({ config: { ...f.config, [k]: v } });
  // live preview: reload the script in the iframe on every change
  useEffect(() => { const t = setTimeout(() => { const d = frame.current?.contentDocument; if (!d) return; d.open(); d.write(`<!doctype html><html><head><meta name="viewport" content="width=device-width"></head><body style="margin:0;background:#f4f4f4;font-family:Arial"><div style="padding:30px;color:#999">Your website</div><script src="${appUrl}/f/${f.id}.js?preview=1&t=${Date.now()}"></script></body></html>`); d.close(); }, 400); return () => clearTimeout(t); }, [f, appUrl]);
  const c = f.config;
  const T = ({ k, l, area }: { k: keyof FormConfig; l: string; area?: boolean }) => (<label className="block text-sm"><span className="text-xs uppercase tracking-wide text-black/50">{l}</span>{area ? <textarea defaultValue={String(c[k] ?? "")} rows={3} onBlur={e => set(k, e.target.value)} className="mt-1 w-full rounded border border-black/10 px-3 py-2" /> : <input defaultValue={String(c[k] ?? "")} onBlur={e => set(k, e.target.value)} className="mt-1 w-full rounded border border-black/10 px-3 py-2" />}</label>);
  const Col = ({ k, l }: { k: keyof FormConfig; l: string }) => (<label className="flex items-center gap-2 text-xs">{l}<input type="color" value={String(c[k])} onChange={e => set(k, e.target.value)} /><span className="flex gap-1">{SW.map(x => <button key={x} onClick={() => set(k, x)} className="h-4 w-4 rounded border border-black/10" style={{ background: x }} />)}</span></label>);
  const snippet = `<script src="${appUrl}/f/${f.id}.js" async></script>`;
  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <Link href="/forms" className="text-sm text-black/50 hover:text-black">← Signup forms</Link>
      <div className="mt-2 flex items-center gap-3"><input defaultValue={f.name} onBlur={e => save({ name: e.target.value })} className="rounded border border-black/10 bg-white px-2 py-1 text-xl font-semibold" /><span className="text-xs text-black/50">{saved === "saving" ? "Saving…" : saved === "saved" ? "Saved" : ""}</span><div className="flex-1" />
        <select value={f.status} onChange={e => { if (e.target.value === "live" && !confirm("Make this popup live on the website?")) return; save({ status: e.target.value }); r.refresh(); }} className={`rounded border px-3 py-1.5 text-sm ${f.status === "live" ? "border-green-300 bg-green-50 text-green-800" : "border-black/15"}`}><option value="draft">Draft (hidden)</option><option value="live">Live on site</option></select></div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[400px_1fr]">
        <div className="space-y-4">
          <section className="space-y-3 rounded-lg border border-black/10 bg-white p-4"><h2 className="font-medium">Content</h2><T k="heading" l="Heading" /><T k="body" l="Text" area /><T k="button" l="Button" /><T k="success" l="Success message" /><T k="placeholder" l="Email placeholder" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={c.askName} onChange={e => set("askName", e.target.checked)} /> Ask for first name</label></section>
          <section className="space-y-3 rounded-lg border border-black/10 bg-white p-4"><h2 className="font-medium">Look</h2>
            <div className="flex items-center gap-3 text-sm"><button onClick={() => setPick(true)} className="rounded border border-black/15 px-3 py-1.5">{c.image ? "Change image" : "Add image…"}</button>{c.image && <button onClick={() => set("image", null)} className="text-xs text-black/50">remove</button>}
              <select value={c.imageSide} onChange={e => set("imageSide", e.target.value)} className="rounded border border-black/10 px-2 py-1"><option value="left">Image left</option><option value="top">Image top</option><option value="none">No image</option></select></div>
            <Col k="bg" l="Background" /><Col k="text" l="Text" /><Col k="buttonBg" l="Button" /><Col k="buttonText" l="Button text" />
            <label className="block text-sm">Corner radius <input type="range" min={0} max={32} value={c.radius} onChange={e => set("radius", Number(e.target.value))} /> {c.radius}px</label></section>
          <section className="space-y-3 rounded-lg border border-black/10 bg-white p-4"><h2 className="font-medium">Behaviour</h2>
            <label className="block text-sm">Show <select value={c.trigger} onChange={e => set("trigger", e.target.value)} className="rounded border border-black/10 px-2 py-1"><option value="delay">after a delay</option><option value="scroll">after scrolling</option><option value="exit">on exit intent (desktop)</option></select></label>
            {c.trigger === "delay" && <label className="block text-sm">Delay <input type="number" min={0} defaultValue={c.delaySeconds} onBlur={e => set("delaySeconds", Number(e.target.value))} className="w-20 rounded border border-black/10 px-2 py-1" /> seconds</label>}
            {c.trigger === "scroll" && <label className="block text-sm">Scroll <input type="number" min={5} max={95} defaultValue={c.scrollPercent} onBlur={e => set("scrollPercent", Number(e.target.value))} className="w-20 rounded border border-black/10 px-2 py-1" /> %</label>}
            <label className="block text-sm">Don't show again for <input type="number" min={0} defaultValue={c.showAgainDays} onBlur={e => set("showAgainDays", Number(e.target.value))} className="w-20 rounded border border-black/10 px-2 py-1" /> days after closing</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={c.hideOnMobile} onChange={e => set("hideOnMobile", e.target.checked)} /> Hide on mobile</label>
            <T k="excludePaths" l="Never show on pages starting with (comma separated)" /></section>
          <section className="rounded-lg border border-black/10 bg-white p-4"><h2 className="font-medium">Install on the website</h2><p className="mt-1 text-xs text-black/60">Shopify admin → Online Store → Themes → ⋯ → Edit code → <code>theme.liquid</code> → paste just before <code>&lt;/body&gt;</code>. Works while Draft (shows nothing) so it can go in now.</p><pre className="mt-2 overflow-x-auto rounded bg-black/5 p-3 text-xs">{snippet}</pre></section>
        </div>
        <div className="rounded-lg border border-black/10 bg-white p-2"><div className="mb-1 px-2 text-xs text-black/50">Live preview</div><iframe ref={frame} title="preview" className="h-[640px] w-full rounded" /></div>
      </div>
      {pick && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6" onClick={() => setPick(false)}><div className="flex h-[85vh] w-[90vw] max-w-6xl flex-col overflow-hidden rounded-lg bg-background shadow-xl" onClick={e => e.stopPropagation()}><div className="flex items-center justify-between border-b border-black/10 bg-white px-4 py-2"><h2 className="font-medium">Choose an image</h2><button onClick={() => setPick(false)} className="text-sm text-black/60">Close</button></div><div className="min-h-0 flex-1"><MediaLibrary compact onSelect={(m: MediaItem) => { set("image", m.url); setPick(false); }} /></div></div></div>}
    </div>
  );
}
