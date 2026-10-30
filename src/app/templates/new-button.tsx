"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function NewTemplateButton() {
  const r = useRouter(); const [busy, setBusy] = useState(false);
  return (
    <button disabled={busy} onClick={async () => {
      setBusy(true);
      const res = await fetch("/api/templates", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "Untitled template" }) });
      const { id } = await res.json(); r.push(`/templates/${id}`);
    }} className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
      New template
    </button>
  );
}
