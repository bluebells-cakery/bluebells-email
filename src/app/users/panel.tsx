"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type U = { id: number; email: string; name: string | null; role: string; totp_enabled: boolean; last_login_at: string | null };
export function UsersPanel({ me, users }: { me: number; users: U[] }) {
  const r = useRouter();
  const [email, setEmail] = useState(""); const [name, setName] = useState(""); const [role, setRole] = useState("staff");
  const [link, setLink] = useState<{ email: string; url: string } | null>(null); const [err, setErr] = useState("");
  const call = async (body: Record<string, unknown>, forEmail?: string) => {
    setErr(""); const res = await fetch("/api/users", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }); const j = await res.json();
    if (!res.ok) { setErr(j.error ?? "Failed"); return; }
    if (j.link && forEmail) setLink({ email: forEmail, url: j.link });
    r.refresh();
  };
  return (
    <div className="mt-6 rounded-lg border border-black/10 bg-white p-5 text-sm">
      <h2 className="font-medium">Logins</h2>
      <table className="mt-3 w-full text-left">
        <thead className="text-xs uppercase tracking-wide text-black/50"><tr><th className="py-1">Person</th><th>Role</th><th>Phone code</th><th>Last login</th><th></th></tr></thead>
        <tbody>{users.map(u => (
          <tr key={u.id} className="border-t border-black/5">
            <td className="py-2">{u.name ?? "—"}<div className="text-xs text-black/50">{u.email}</div></td>
            <td>{u.id === me ? u.role : <select value={u.role} onChange={e => call({ id: u.id, action: "role", role: e.target.value })} className="rounded border border-black/10 px-1 py-0.5"><option value="staff">staff</option><option value="owner">owner</option></select>}</td>
            <td>{u.totp_enabled ? "On" : <span className="text-amber-700">Not set up yet</span>}</td>
            <td className="text-xs text-black/60">{u.last_login_at ? new Date(u.last_login_at).toLocaleString("en-NZ") : "never"}</td>
            <td className="space-x-2 text-right text-xs">{u.id !== me && <>
              <button onClick={() => confirm(`Reset ${u.email}? Their password and phone code stop working and you get a new setup link.`) && call({ id: u.id, action: "reset" }, u.email)} className="underline">Reset</button>
              <button onClick={() => confirm(`Remove ${u.email}?`) && call({ id: u.id, action: "remove" })} className="text-red-700 underline">Remove</button></>}</td>
          </tr>))}</tbody>
      </table>
      <h3 className="mt-5 font-medium">Add a person</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" className="rounded border border-black/10 px-2 py-1.5" />
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="flex-1 rounded border border-black/10 px-2 py-1.5" />
        <select value={role} onChange={e => setRole(e.target.value)} className="rounded border border-black/10 px-2 py-1.5"><option value="staff">Staff (can build, can&apos;t send)</option><option value="owner">Owner (can send)</option></select>
        <button onClick={async () => { await call({ email, name, role }, email); setEmail(""); setName(""); }} className="rounded-md bg-brand px-3 py-1.5 font-medium text-white">Add</button>
      </div>
      {err && <p className="mt-2 text-red-700">{err}</p>}
      {link && <div className="mt-3 rounded border border-green-600/40 bg-green-50 p-3">
        <div className="font-medium text-green-900">Send this setup link to {link.email} (works once, for 48 hours):</div>
        <div className="mt-1 flex gap-2"><code className="flex-1 break-all rounded bg-white p-2 text-xs">{link.url}</code><button onClick={() => navigator.clipboard.writeText(link.url)} className="rounded border border-black/15 px-2 text-xs">Copy</button></div>
      </div>}
    </div>
  );
}
