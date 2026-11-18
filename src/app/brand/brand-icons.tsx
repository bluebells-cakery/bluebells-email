"use client";
import { useEffect, useState } from "react";
import { brand, SWATCHES } from "@/lib/brand";

/** Logo, icons and stickers, recoloured to any brand colour. In the email editor (onAdd) each one has "Add to email". */
export function BrandIcons({ onAdd }: { onAdd: (m: { url: string; width: number; height: number }, id: string) => void }) {
  const [fill, setFill] = useState("#262967");
  const [svgs, setSvgs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => { brand.elements.forEach(async e => { const t = await (await fetch(e.file)).text(); setSvgs(s => ({ ...s, [e.id]: t })); }); }, []);
  const recolour = (svg: string, f: string) => svg.replace(/(fill|stroke)="(?!none)[^"]*"/g, `$1="${f}"`);
  const add = async (id: string, svg: string, recol: boolean) => {
    setBusy(id);
    const width = id === "logo" ? 1200 : 600;
    const r = await fetch("/api/brand/save", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ svg, filename: `${id}-${recol ? fill.slice(1) : "original"}`, width }) });
    const m = await r.json(); setBusy(null);
    if (r.ok) onAdd({ url: m.url, width: m.width ?? width, height: m.height ?? width }, id);
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">Colour <input type="color" value={fill} onChange={e => setFill(e.target.value)} />
        <span className="flex gap-1">{SWATCHES.map(c => <button key={c} onClick={() => setFill(c)} className="h-5 w-5 rounded border border-black/10" style={{ background: c }} />)}</span></div>
      <div className="grid grid-cols-3 gap-3">
        {brand.elements.map(e => { const svg = svgs[e.id]; const shown = svg && e.recolour ? recolour(svg, fill) : svg; return (
          <div key={e.id} className="rounded border border-black/10 p-2">
            <div className="flex h-20 items-center justify-center rounded bg-black/[.03] [&_svg]:max-h-16 [&_svg]:max-w-full" dangerouslySetInnerHTML={{ __html: shown ?? "" }} />
            <div className="mt-1 truncate text-xs font-medium">{e.name}</div>
            <button disabled={!shown || !!busy} onClick={() => add(e.id, shown!, e.recolour)} className="mt-1 text-xs text-brand hover:underline disabled:opacity-50">{busy === e.id ? "Adding…" : "Add to email"}</button>
          </div>); })}
      </div>
    </div>
  );
}
