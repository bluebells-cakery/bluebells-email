"use client";
import { useState } from "react";

export function HtmlPreview({ name, subject, html }: { id: string; name: string; subject: string | null; html: string }) {
  const [width, setWidth] = useState<600 | 375>(600);
  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex items-center gap-4 border-b border-black/10 bg-white px-6 py-2 text-sm">
        <div><div className="font-medium">{name}</div>{subject && <div className="text-xs text-black/50">Subject: {subject}</div>}</div>
        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">Imported from Klaviyo · reference only</span>
        <div className="flex-1" />
        <button onClick={() => setWidth(600)} className={`rounded px-2 py-1 ${width === 600 ? "bg-black/10" : ""}`}>Desktop</button>
        <button onClick={() => setWidth(375)} className={`rounded px-2 py-1 ${width === 375 ? "bg-black/10" : ""}`}>Mobile</button>
      </div>
      <div className="flex-1 overflow-auto bg-black/5 p-6">
        <iframe srcDoc={html} title={name} style={{ width, height: "100%", minHeight: 1400 }} className="mx-auto block rounded bg-white shadow" sandbox="" />
      </div>
    </div>
  );
}
