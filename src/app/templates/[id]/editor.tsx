"use client";
import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import type { EditorRef, EmailEditorProps } from "react-email-editor";

const EmailEditor = dynamic(() => import("react-email-editor"), { ssr: false });

export function TemplateEditor({ id, name: initialName, design }: { id: string; name: string; design: object }) {
  const ref = useRef<EditorRef>(null);
  const [name, setName] = useState(initialName);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  const save = () => {
    const u = ref.current?.editor; if (!u) return;
    setStatus("saving");
    u.exportHtml(async ({ design, html }) => {
      await fetch(`/api/templates/${id}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, design, html }) });
      setStatus("saved"); setTimeout(() => setStatus("idle"), 1500);
    });
  };

  const onReady: EmailEditorProps["onReady"] = (u) => {
    if (design && Object.keys(design).length) u.loadDesign(design as never);
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex items-center gap-3 border-b border-black/10 bg-white px-6 py-2">
        <input value={name} onChange={e => setName(e.target.value)} className="rounded border border-black/10 px-2 py-1 text-sm font-medium" />
        <span className="text-xs text-black/50">{status === "saving" ? "Saving…" : status === "saved" ? "Saved" : ""}</span>
        <div className="flex-1" />
        <button onClick={save} className="rounded-md bg-brand px-4 py-1.5 text-sm font-medium text-white hover:opacity-90">Save</button>
      </div>
      <div className="flex-1 min-h-0">
        <EmailEditor
          ref={ref}
          onReady={onReady}
          minHeight="100%"
          options={{
            projectId: Number(process.env.NEXT_PUBLIC_UNLAYER_PROJECT_ID) || undefined,
            displayMode: "email",
            appearance: { theme: "modern_light" },
            mergeTags: {
              first_name: { name: "First name", value: "{{first_name}}" },
              last_name: { name: "Last name", value: "{{last_name}}" },
              email: { name: "Email", value: "{{email}}" },
              unsubscribe_url: { name: "Unsubscribe link", value: "{{unsubscribe_url}}" },
            },
          }}
        />
      </div>
    </div>
  );
}
