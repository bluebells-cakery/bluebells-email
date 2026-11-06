"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { EditorRef, EmailEditorProps } from "react-email-editor";
import { MediaLibrary, type MediaItem } from "@/components/media-library";
import { brand } from "@/lib/brand";
import { BlocksPanel } from "@/components/blocks-panel";
import { AssistantPanel } from "@/components/assistant-panel";
import { insertRows } from "@/lib/blocks";

const brandColourGroups = Object.entries(brand.colours).map(([label, list], i) => ({ id: i === 0 ? "brand_colors" : `brand_${i}`, label: `Bluebells · ${label}`, colors: list.map(([, hex]) => hex), default: i === 0 }));
const fontUrl = (g: string) => `https://fonts.googleapis.com/css2?family=${g}&display=swap`;

const EmailEditor = dynamic(() => import("react-email-editor"), { ssr: false });

type ExtraFont = { label: string; family: string; google: string; fallback: string };

export function TemplateEditor({ id, name: initialName, design, extraFonts = [] }: { id: string; name: string; design: object; extraFonts?: ExtraFont[] }) {
  const ref = useRef<EditorRef>(null);
  const [name, setName] = useState(initialName);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [picker, setPicker] = useState<((url: string) => void) | null>(null);
  const [blocks, setBlocks] = useState(false);
  const [assist, setAssist] = useState(false);

  const insert = (rows: Record<string, unknown>[]) => {
    const u = ref.current?.editor; if (!u) return;
    u.saveDesign((d: Record<string, unknown>) => u.loadDesign(insertRows(d, rows) as never));
  };

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
        <input value={name} onChange={e => setName(e.target.value)} className="rounded border border-black/10 px-2 py-1 text-sm font-medium" />
        <span className="text-xs text-black/50">{status === "saving" ? "Saving…" : status === "saved" ? "Saved" : ""}</span>
        <div className="flex-1" />
        <button onClick={() => { setAssist(a => !a); setBlocks(false); }} className={`rounded-md border px-3 py-1.5 text-sm font-medium ${assist ? "border-brand text-brand" : "border-black/15 hover:border-black/40"}`}>Ask Claude</button>
        <button onClick={() => { setBlocks(b => !b); setAssist(false); }} className={`rounded-md border px-3 py-1.5 text-sm font-medium ${blocks ? "border-brand text-brand" : "border-black/15 hover:border-black/40"}`}>Bluebells blocks</button>
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
            designTags: { brand_navy: "#262967", brand_cream: "#fffdf8", brand_teal: "#00bfb3" },
            mergeTags: {
              first_name: { name: "First name", value: "{{first_name}}" },
              last_name: { name: "Last name", value: "{{last_name}}" },
              email: { name: "Email", value: "{{email}}" },
              unsubscribe_url: { name: "Unsubscribe link", value: "{{unsubscribe_url}}" },
            },
          }} />
      </div>
      {blocks && <BlocksPanel onInsert={insert} onClose={() => setBlocks(false)} />}
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
