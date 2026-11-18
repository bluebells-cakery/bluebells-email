"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { EditorRef, EmailEditorProps } from "react-email-editor";
import { MediaLibrary, type MediaItem } from "@/components/media-library";
import { brand } from "@/lib/brand";
import { BlocksPanel } from "@/components/blocks-panel";
import { AssistantPanel } from "@/components/assistant-panel";
import { insertRows } from "@/lib/blocks";
import { CanvaPanel, type CanvaItem } from "@/components/canva-panel";
import { TrimCropper } from "@/components/trim-cropper";
import { imageRow } from "@/lib/blocks";

const brandColourGroups = Object.entries(brand.colours).map(([label, list], i) => ({ id: i === 0 ? "brand_colors" : `brand_${i}`, label: `Bluebells · ${label}`, colors: list.map(([, hex]) => hex), default: i === 0 }));
const fontUrl = (g: string) => `https://fonts.googleapis.com/css2?family=${g}&display=swap`;

const EmailEditor = dynamic(() => import("react-email-editor"), { ssr: false });

type ExtraFont = { label: string; family: string; google: string; fallback: string };

export function TemplateEditor({ id, name: initialName, design, extraFonts = [] }: { id: string; name: string; design: object; extraFonts?: ExtraFont[] }) {
  const ref = useRef<EditorRef>(null);
  const [name, setName] = useState(initialName);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [picker, setPicker] = useState<((url: string) => void) | null>(null);
  const [blocks, setBlocks] = useState(false); const [canva, setCanva] = useState(false); const [media, setMedia] = useState(false); const [cropQ, setCropQ] = useState<CanvaItem[]>([]);
  const [assist, setAssist] = useState(false);

  const insert = (rows: Record<string, unknown>[]) => {
    const u = ref.current?.editor; if (!u) return;
    u.saveDesign((d: Record<string, unknown>) => u.loadDesign(insertRows(d, rows) as never));
  };

  // Crop any image already in the email: list them, pick one, trim, swap it in place.
  type Pic = { path: [number, number, number]; url: string; kind: "image" | "html" };
  const [pics, setPics] = useState<Pic[] | null>(null); const [cropPic, setCropPic] = useState<Pic | null>(null);
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const openCrop = () => {
    const u = ref.current?.editor; if (!u) return;
    u.saveDesign((d: any) => {
      const out: Pic[] = [];
      (d?.body?.rows ?? []).forEach((r: any, ri: number) => (r.columns ?? []).forEach((c: any, ci: number) => (c.contents ?? []).forEach((x: any, xi: number) => {
        if (x.type === "image" && x.values?.src?.url) out.push({ path: [ri, ci, xi], url: x.values.src.url, kind: "image" });
        else if (x.type === "html") { const m = String(x.values?.html ?? "").match(/<img[^>]+src="([^"]+)"/i); if (m) out.push({ path: [ri, ci, xi], url: m[1].replace(/&amp;/g, "&"), kind: "html" }); }
      })));
      setPics(out);
    });
  };
  const applyCrop = (p: Pic, m: { url: string; width: number; height: number }) => {
    const u = ref.current?.editor; if (!u) return;
    u.saveDesign((d: any) => {
      const x = d?.body?.rows?.[p.path[0]]?.columns?.[p.path[1]]?.contents?.[p.path[2]]; if (!x) return;
      if (p.kind === "image") x.values.src = { ...x.values.src, url: m.url, width: m.width, height: m.height };
      else x.values.html = String(x.values.html).replace(/(<img[^>]+src=")[^"]+(")/i, `$1${m.url}$2`);
      u.loadDesign(d as never);
    });
  };
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const [campaignId, setCampaignId] = useState<string | null>(null);
  useEffect(() => { setCampaignId(new URLSearchParams(window.location.search).get("campaign")); }, []);
  const save = (then?: () => void) => {
    const u = ref.current?.editor; if (!u) return;
    setStatus("saving");
    u.exportHtml(async ({ design, html }) => {
      await fetch(`/api/templates/${id}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, design, html }) });
      if (campaignId) await fetch(`/api/campaigns/${campaignId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ template_id: Number(id) }) }).catch(() => {}); // pull edits into the campaign
      setStatus("saved"); setTimeout(() => setStatus("idle"), 1500);
      then?.();
    });
  };
  // Send test: saves first, then emails the saved version to the ticked addresses.
  const [testOpen, setTestOpen] = useState(false); const [testSaved, setTestSaved] = useState<string[]>([]); const [testPick, setTestPick] = useState<string[]>([]);
  const [testExtra, setTestExtra] = useState(""); const [testMsg, setTestMsg] = useState(""); const [testBusy, setTestBusy] = useState(false);
  const openTest = async () => {
    setTestOpen(o => !o); setTestMsg("");
    if (!testSaved.length) { const j = await (await fetch(`/api/templates/${id}/test`)).json(); setTestSaved(j.saved ?? []); setTestPick(j.saved ?? []); }
  };
  const sendTest = () => {
    setTestBusy(true); setTestMsg("Saving…");
    save(async () => {
      setTestMsg("Sending…");
      const to = [...testPick, ...testExtra.split(/[,\s]+/).filter(Boolean)];
      const res = await fetch(`/api/templates/${id}/test`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ to, campaignId }) });
      const j = await res.json(); setTestBusy(false);
      setTestMsg(!res.ok ? j.error ?? "Failed" : j.ok ? `✓ Test sent to ${j.results.map((r: { to: string }) => r.to).join(", ")}` : "Some failed: " + j.results.filter((r: { error?: string }) => r.error).map((r: { to: string; error?: string }) => `${r.to} (${r.error})`).join(", "));
    });
  };
  const back = () => save(() => { window.location.href = campaignId ? `/campaigns/${campaignId}` : "/templates"; });

  // Replace Unlayer's image picker with our media library. Registered on the global unlayer object as soon as embed.js
  // loads (before the editor is created, like Unlayer's own example) and again on the editor instance in onLoad.
  const selectImage = (_data: unknown, done: (r: { url: string }) => void) => {
    setPicker(() => (url: string) => { done({ url }); setPicker(null); });
  };
  useEffect(() => {
    const t = setInterval(() => {
      const g = (window as unknown as { unlayer?: { registerCallback: (n: string, f: unknown) => void } }).unlayer;
      if (g?.registerCallback) { g.registerCallback("selectImage", selectImage); clearInterval(t); }
    }, 25);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const onLoad: EmailEditorProps["onLoad"] = (u) => { u.registerCallback("selectImage", selectImage); };
  const onReady: EmailEditorProps["onReady"] = (u) => {
    if (design && Object.keys(design).length) u.loadDesign(design as never);
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex items-center gap-3 border-b border-black/10 bg-white px-6 py-2">
        <button onClick={back} className="rounded-md border border-black/15 px-3 py-1.5 text-sm hover:border-black/40">← {campaignId ? "Back to campaign" : "Templates"}</button>
        {campaignId
          ? <span className="text-sm font-medium">Editing email for: {name.replace(/ – email$/, "")}</span>
          : <input value={name} onChange={e => setName(e.target.value)} title="Template name" className="rounded border border-black/10 px-2 py-1 text-sm font-medium" />}
        <span className="text-xs text-black/50">{status === "saving" ? "Saving…" : status === "saved" ? "Saved" : ""}</span>
        <div className="flex-1" />
        <button onClick={() => { setAssist(a => !a); setBlocks(false); setCanva(false); setMedia(false); }} className={`rounded-md border px-3 py-1.5 text-sm font-medium ${assist ? "border-brand text-brand" : "border-black/15 hover:border-black/40"}`}>Ask Claude</button>
        <button onClick={() => { setMedia(m => !m); setCanva(false); setAssist(false); setBlocks(false); }} className={`rounded-md border px-3 py-1.5 text-sm font-medium ${media ? "border-brand text-brand" : "border-black/15 hover:border-black/40"}`}>Media</button>
        <button onClick={openCrop} className="rounded-md border border-black/15 px-3 py-1.5 text-sm font-medium hover:border-black/40">Crop image</button>
        <button onClick={() => { setCanva(c => !c); setAssist(false); setBlocks(false); setMedia(false); }} className={`rounded-md border px-3 py-1.5 text-sm font-medium ${canva ? "border-brand text-brand" : "border-black/15 hover:border-black/40"}`}>Canva</button>
        <button onClick={() => { setBlocks(b => !b); setAssist(false); setCanva(false); setMedia(false); }} className={`rounded-md border px-3 py-1.5 text-sm font-medium ${blocks ? "border-brand text-brand" : "border-black/15 hover:border-black/40"}`}>Bluebells blocks</button>
        <div className="relative">
          <button onClick={openTest} className={`rounded-md border px-3 py-1.5 text-sm font-medium ${testOpen ? "border-brand text-brand" : "border-black/15 hover:border-black/40"}`}>Send test</button>
          {testOpen && <div className="absolute right-0 top-full z-40 mt-2 w-80 rounded-lg border border-black/10 bg-white p-4 text-sm shadow-xl">
            <div className="font-medium">Send a test</div>
            <div className="mt-2 space-y-1">{testSaved.map(a => <label key={a} className="flex items-center gap-2"><input type="checkbox" checked={testPick.includes(a)} onChange={e => setTestPick(p => e.target.checked ? [...p, a] : p.filter(x => x !== a))} /> {a}</label>)}</div>
            <input value={testExtra} onChange={e => setTestExtra(e.target.value)} placeholder="Other addresses (comma separated)" className="mt-2 w-full rounded border border-black/10 px-2 py-1.5 text-xs" />
            <button disabled={testBusy} onClick={sendTest} className="mt-3 w-full rounded-md bg-brand px-3 py-1.5 font-medium text-white disabled:opacity-50">{testBusy ? "Working…" : "Save and send test"}</button>
            {testMsg && <div className={`mt-2 text-xs ${testMsg.startsWith("✓") ? "text-green-700" : "text-black/60"}`}>{testMsg}</div>}
            <div className="mt-2 text-[11px] text-black/40">Subject gets a [TEST] prefix. Nothing goes to customers.</div>
          </div>}
        </div>
        <button onClick={() => save()} className="rounded-md bg-brand px-4 py-1.5 text-sm font-medium text-white hover:opacity-90">Save</button>
      </div>
      <div className="flex min-h-0 flex-1">
      <div className="min-h-0 flex-1">
        <EmailEditor ref={ref} onLoad={onLoad} onReady={onReady} minHeight="100%"
          options={{
            projectId: Number(process.env.NEXT_PUBLIC_UNLAYER_PROJECT_ID) || undefined,
            displayMode: "email",
            appearance: { theme: "modern_light" },
            features: { textEditor: { spellChecker: true }, colorPicker: { colors: brandColourGroups, recentColors: false }, userUploads: false },
            fonts: {
              showDefaultFonts: false,
              customFonts: [
                { label: "Crimson Pro (headings)", value: `'Crimson Pro', Georgia, 'Times New Roman', serif`, url: fontUrl(brand.fonts.heading.google) },
                { label: "Poppins (body)", value: `'Poppins', Arial, Helvetica, sans-serif`, url: fontUrl(brand.fonts.body.google) },
                ...extraFonts.map(f => ({ label: f.label, value: `'${f.family}', ${f.fallback}`, url: fontUrl(f.google) })),
              ],
            },
            designTags: { brand_navy: "#262967", brand_cream: "#fffdf8", brand_pink: "#e4c5e0" },
            mergeTags: {
              first_name: { name: "First name", value: "{{first_name}}" },
              last_name: { name: "Last name", value: "{{last_name}}" },
              email: { name: "Email", value: "{{email}}" },
              unsubscribe_url: { name: "Unsubscribe link", value: "{{unsubscribe_url}}" },
            },
          }} />
      </div>
      {blocks && <BlocksPanel onInsert={insert} onClose={() => setBlocks(false)} />}
      {media && <div className="flex h-full w-[460px] flex-col border-l border-black/10 bg-white">
        <div className="flex items-center gap-2 border-b border-black/10 px-3 py-2"><span className="text-sm font-medium">Media library</span><span className="text-xs text-black/50">click an image to add it to the email</span><div className="flex-1" /><button onClick={() => setMedia(false)} className="text-xs text-black/50 hover:text-black">Close</button></div>
        <div className="min-h-0 flex-1 overflow-hidden"><MediaLibrary compact onSelect={(m: MediaItem) => { const w = m.width ?? 600, h = m.height ?? 600; insert([imageRow(m.url, w, h, w >= 700 ? { maxWidth: 600, padding: "0px" } : { maxWidth: Math.min(w, 300), padding: "20px" })]); }} /></div>
      </div>}
      {canva && <CanvaPanel insertLabel="Add to email" onClose={() => setCanva(false)} onImported={items => setCropQ(q => [...q, ...items])} />}
      {pics && !cropPic && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setPics(null)}>
        <div className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
          <h2 className="text-lg font-semibold">Which image do you want to crop?</h2>
          {pics.length === 0 ? <p className="mt-3 text-sm text-black/60">There are no images in this email yet.</p> : (
            <div className="mt-3 grid grid-cols-3 gap-3">{pics.map((p, i) => (
              <button key={i} onClick={() => setCropPic(p)} className="overflow-hidden rounded-lg border border-black/10 bg-black/5 p-1 hover:border-brand">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" className="h-40 w-full object-contain" />
              </button>))}</div>)}
          <button onClick={() => setPics(null)} className="mt-4 text-sm text-black/50 hover:text-black">Cancel</button>
        </div>
      </div>}
      {cropPic && <TrimCropper key={"c" + cropPic.url} url={cropPic.url} doneLabel="Save crop"
        onDone={m => { applyCrop(cropPic, m); setCropPic(null); setPics(null); }}
        onCancel={() => { setCropPic(null); setPics(null); }} />}
      {cropQ[0] && <TrimCropper key={cropQ[0].url} url={cropQ[0].url}
        onDone={m => { insert([imageRow(m.url, m.width, m.height, { maxWidth: 600, padding: "0px" })]); setCropQ(q => q.slice(1)); }}
        onWhole={() => { const m = cropQ[0]; insert([imageRow(m.url, m.width ?? 1200, m.height ?? 1200, { maxWidth: 600, padding: "0px" })]); setCropQ(q => q.slice(1)); }}
        onCancel={() => setCropQ(q => q.slice(1))} />}
      {assist && <AssistantPanel onInsert={insert} onClose={() => setAssist(false)} />}
      </div>
      {picker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6" onClick={() => setPicker(null)}>
          <div className="flex h-[85vh] w-[90vw] max-w-6xl flex-col overflow-hidden rounded-lg bg-background shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-black/10 bg-white px-4 py-2">
              <h2 className="font-medium">Choose an image</h2>
              <button onClick={() => setPicker(null)} className="text-sm text-black/60 hover:text-black">Close</button>
            </div>
            <div className="min-h-0 flex-1"><MediaLibrary compact onSelect={(m: MediaItem) => picker(m.url)} /></div>
          </div>
        </div>
      )}
    </div>
  );
}
