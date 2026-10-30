"use client";
import { useState } from "react";

type Row = Record<string, unknown>;
type Msg = { role: "user" | "assistant"; content: string; rows?: Row[]; suggestions?: string[] };

export function AssistantPanel({ onInsert, onClose }: { onInsert: (rows: Row[]) => void; onClose: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    const prompt = input.trim(); if (!prompt || busy) return;
    setInput(""); setBusy(true);
    const history = msgs.map(m => ({ role: m.role, content: m.content }));
    setMsgs(m => [...m, { role: "user", content: prompt }]);
    const r = await fetch("/api/assistant", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt, history }) });
    const j = await r.json(); setBusy(false);
    if (j.kind === "rows") setMsgs(m => [...m, { role: "assistant", content: j.note || "Here's the block.", rows: j.rows }]);
    else if (j.kind === "copy") setMsgs(m => [...m, { role: "assistant", content: j.note || "Some options:", suggestions: j.suggestions }]);
    else setMsgs(m => [...m, { role: "assistant", content: j.text }]);
  };

  return (
    <div className="flex h-full w-[420px] flex-col border-l border-black/10 bg-white">
      <div className="flex items-center border-b border-black/10 px-3 py-2"><span className="text-sm font-medium">Ask Claude</span><div className="flex-1" /><button onClick={onClose} className="text-xs text-black/50 hover:text-black">Close</button></div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 text-sm">
        {msgs.length === 0 && <div className="rounded bg-black/5 p-3 text-xs text-black/60">Try: “Two columns — the Kids Cakes hero photo on the left, a short intro and a teal ‘Order now’ button on the right, blush background.” · “Product row with our three gift boxes.” · “Five subject lines for a Christmas pre-order email.”</div>}
        {msgs.map((m, i) => (
          <div key={i} className={m.role === "user" ? "ml-8 rounded-lg bg-brand/10 p-2" : "mr-8 rounded-lg bg-black/5 p-2"}>
            <div className="whitespace-pre-wrap">{m.content}</div>
            {m.rows && <button onClick={() => onInsert(m.rows!)} className="mt-2 rounded-md bg-brand px-3 py-1 text-xs font-medium text-white">Insert into email</button>}
            {m.suggestions && <ul className="mt-2 space-y-1">{m.suggestions.map((s, k) => <li key={k} className="flex items-start gap-2 rounded bg-white p-2 text-xs"><span className="flex-1">{s}</span><button onClick={() => navigator.clipboard.writeText(s)} className="text-brand">Copy</button></li>)}</ul>}
          </div>
        ))}
        {busy && <div className="mr-8 rounded-lg bg-black/5 p-2 text-xs text-black/50">Thinking…</div>}
      </div>
      <div className="flex gap-2 border-t border-black/10 p-2">
        <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} rows={2} placeholder="Describe a block or ask for copy…" className="flex-1 resize-none rounded border border-black/10 px-2 py-1.5 text-sm" />
        <button onClick={send} disabled={busy} className="rounded-md bg-brand px-3 text-sm font-medium text-white disabled:opacity-50">Send</button>
      </div>
    </div>
  );
}
