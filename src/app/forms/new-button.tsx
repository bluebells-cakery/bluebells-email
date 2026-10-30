"use client";
import { useRouter } from "next/navigation";
export function NewFormButton() { const r = useRouter(); return <button onClick={async () => { const { id } = await (await fetch("/api/forms", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })).json(); r.push(`/forms/${id}`); }} className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white">New popup</button>; }
