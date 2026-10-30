"use client";
import { useEffect, useState } from "react";
import type { brand as Brand } from "@/lib/brand";
import { WavyCircle } from "./wavy-circle";

type B = typeof Brand;

function Swatch({ name, hex }: { name: string; hex: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(hex); setCopied(true); setTimeout(() => setCopied(false), 1000); }} className="text-left">
      <div className="h-16 w-full rounded-md border border-black/10" style={{ background: hex }} />
      <div className="mt-1 text-xs font-medium">{name}</div>
      <div className="font-mono text-[11px] text-black/50">{copied ? "copied" : hex}</div>
    </button>
  );
}

export function BrandClient({ brand }: { brand: B }) {
  const [waveFill, setWaveFill] = useState("#fbe7e6");
  const [waveBg, setWaveBg] = useState("#fffdf8");
  const [elFill, setElFill] = useState("#262967");
  const [svgs, setSvgs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [tab, setTab] = useState<"type" | "colours" | "elements">("type");

  useEffect(() => { brand.elements.forEach(async e => { const t = await (await fetch(e.file)).text(); setSvgs(s => ({ ...s, [e.id]: t })); }); }, [brand]);

  const recolour = (svg: string, fill: string) => svg.replace(/(fill|stroke)="(?!none)[^"]*"/g, `$1="${fill}"`);
  const waveSvg = (w: number, h: number) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 1158 40" preserveAspectRatio="none"><rect width="1158" height="40" fill="${waveBg}"/><g transform="translate(0,40) scale(0.1,-0.1)" fill="${waveFill}"><path d="${brand.wavePath}"/></g></svg>`;

  const save = async (key: string, svg: string, filename: string, width: number) => {
    setBusy(key);
    const r = await fetch("/api/brand/save", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ svg, filename, width }) });
    setBusy(null); if (r.ok) { setSaved(key); setTimeout(() => setSaved(null), 2000); }
  };

  const H = { fontFamily: `'${brand.fonts.heading.family}', ${brand.fonts.heading.fallback}` };
  const P = { fontFamily: `'${brand.fonts.body.family}', ${brand.fonts.body.fallback}` };

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Brand</h1>
        <p className="mt-1 text-sm text-black/60">Pulled from bluebellscakery.com.</p>
        <div className="mt-6 flex gap-1 border-b border-black/10">
          {([["type", "Typography"], ["colours", "Colours"], ["elements", "Design elements"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${tab === k ? "border-brand text-brand" : "border-transparent text-black/60 hover:text-black"}`}>{l}</button>
          ))}
        </div>
      </div>

      {tab === "type" && <section>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-black/10 bg-white p-5">
            <div className="text-xs uppercase tracking-wide text-black/50">Headings</div>
            <div className="mt-1 text-xl" style={H}>Crimson Pro <span className="text-sm text-black/50">· regular 400</span></div>
            <div className="mt-2 font-mono text-xs text-black/50">font-family: &apos;Crimson Pro&apos;, &apos;Times New Roman&apos;, serif</div>
          </div>
          <div className="rounded-lg border border-black/10 bg-white p-5">
            <div className="text-xs uppercase tracking-wide text-black/50">Body</div>
            <div className="mt-1 text-xl" style={P}>Poppins <span className="text-sm text-black/50">· 400 / 700</span></div>
            <div className="mt-2 font-mono text-xs text-black/50">font-family: &apos;Poppins&apos;, Arial, sans-serif</div>
          </div>
        </div>
        <p className="mt-2 text-xs text-black/50">Email note: Crimson Pro and Poppins only render where Google Fonts are supported (Apple Mail, iOS, some Android). Gmail/Outlook fall back to Georgia/Arial — set those as fallbacks in Unlayer’s font settings.</p>
      </section>}

      {tab === "colours" && <section>
        <p className="mb-4 text-sm text-black/60">Click a swatch to copy its hex.</p>
        {Object.entries(brand.colours).map(([group, list]) => (
          <div key={group} className="mb-6">
            <div className="mb-2 text-sm font-medium text-black/70">{group}</div>
            <div className="grid grid-cols-3 gap-3 md:grid-cols-6">{list.map(([n, hex]) => <Swatch key={hex + n} name={n} hex={hex} />)}</div>
          </div>
        ))}
      </section>}

      {tab === "elements" && <section>
        <p className="mb-4 text-sm text-black/60">“Save to media” renders an element as a PNG you can drop into any email.</p>

        <div className="rounded-lg border border-black/10 bg-white p-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="font-medium">Wave divider</div>
            <label className="flex items-center gap-2 text-sm">Wave <input type="color" value={waveFill} onChange={e => setWaveFill(e.target.value)} /></label>
            <label className="flex items-center gap-2 text-sm">Behind <input type="color" value={waveBg} onChange={e => setWaveBg(e.target.value)} /></label>
            <div className="flex gap-1">{["#fbe7e6", "#fcd1bd", "#fff9ea", "#e4c5e0", "#c0e6ef", "#262967", "#ffffff"].map(c => <button key={c} onClick={() => setWaveFill(c)} className="h-6 w-6 rounded border border-black/10" style={{ background: c }} />)}</div>
            <div className="flex-1" />
            <button disabled={!!busy} onClick={() => save("wave", waveSvg(1200, 41), `wave-${waveFill.slice(1)}-on-${waveBg.slice(1)}`, 1200)} className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">{busy === "wave" ? "Saving…" : saved === "wave" ? "Saved to media" : "Save to media (1200px PNG)"}</button>
          </div>
          <div className="mt-4 overflow-hidden rounded" style={{ background: waveBg }} dangerouslySetInnerHTML={{ __html: waveSvg(1158, 60).replace('width="1158" height="60"', 'width="100%" height="60"') }} />
          <p className="mt-2 text-xs text-black/50">On the site the wave sits between a coloured section and the next; in email, place the PNG as a full-width image directly under a block with the “Wave” colour as its background.</p>
        </div>

        <WavyCircle />

        <div className="mt-6 rounded-lg border border-black/10 bg-white p-5">
          <div className="flex flex-wrap items-center gap-4">
            <div className="font-medium">Icons &amp; stickers</div>
            <label className="flex items-center gap-2 text-sm">Colour <input type="color" value={elFill} onChange={e => setElFill(e.target.value)} /></label>
            <div className="flex gap-1">{["#262967", "#00bfb3", "#fbe7e6", "#fcd1bd", "#ffd56a", "#f67c43", "#ffffff"].map(c => <button key={c} onClick={() => setElFill(c)} className="h-6 w-6 rounded border border-black/10" style={{ background: c }} />)}</div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4 md:grid-cols-6">
            {brand.elements.map(e => {
              const svg = svgs[e.id]; const shown = svg && e.recolour ? recolour(svg, elFill) : svg;
              return (
                <div key={e.id} className="rounded border border-black/10 p-3">
                  <div className="flex h-24 items-center justify-center rounded bg-[#fffdf8] [&_svg]:max-h-20 [&_svg]:max-w-full" dangerouslySetInnerHTML={{ __html: shown ?? "" }} />
                  <div className="mt-2 text-xs font-medium">{e.name}</div>
                  <button disabled={!shown || !!busy} onClick={() => save(e.id, shown!, `${e.id}-${e.recolour ? elFill.slice(1) : "original"}`, e.id === "logo" ? 1200 : 600)} className="mt-1 text-xs text-brand hover:underline disabled:opacity-50">{busy === e.id ? "Saving…" : saved === e.id ? "Saved ✓" : "Save to media"}</button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-black/10 bg-white p-5">
          <div className="font-medium">Rotated image block</div>
          <p className="mt-1 text-sm text-black/60">The site tilts photos a few degrees with a pastel “card” behind them. Email clients can’t rotate, so I’ll add a generator here next: pick any photo from the media library + tilt + card colour → saved as a flat PNG. Tell me the look you want (tilt angle, shadow, border) and I’ll build it.</p>
          <div className="mt-4 flex gap-6">
            {[-4, 3].map(deg => (
              <div key={deg} className="relative h-40 w-32">
                <div className="absolute inset-0 rounded-lg" style={{ background: "#fbe7e6", transform: `rotate(${deg * -1.5}deg)` }} />
                <div className="absolute inset-0 rounded-lg bg-[url(/brand/logo.png)] bg-white bg-contain bg-center bg-no-repeat shadow" style={{ transform: `rotate(${deg}deg)` }} />
              </div>
            ))}
          </div>
        </div>
      </section>}
    </div>
  );
}
