import type { SendArgs } from "@/lib/ses";

const API = "https://api.resend.com";
const key = () => process.env.RESEND_API_KEY!;

export async function resendSend(a: SendArgs): Promise<string> {
  const fromEmail = a.fromEmail ?? process.env.SES_FROM_EMAIL!;
  const fromName = a.fromName ?? "Bluebells Cakery";
  const headers: Record<string, string> = {};
  if (a.unsubscribeUrl) { headers["List-Unsubscribe"] = `<${a.unsubscribeUrl}>`; headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click"; }
  const body = {
    from: `${fromName} <${fromEmail}>`,
    to: [a.to],
    reply_to: a.replyTo,
    subject: a.subject,
    html: a.html,
    text: a.text,
    headers,
    tags: a.tags ? Object.entries(a.tags).filter(([, v]) => v).map(([name, value]) => ({ name, value: String(value).replace(/[^a-zA-Z0-9_-]/g, "_") })) : undefined,
  };
  for (let i = 0; i < 4; i++) {
    const r = await fetch(`${API}/emails`, { method: "POST", headers: { Authorization: `Bearer ${key()}`, "content-type": "application/json" }, body: JSON.stringify(body) });
    if (r.status === 429) { await new Promise(s => setTimeout(s, 600 * (i + 1))); continue; }
    const j = await r.json() as { id?: string; message?: string; name?: string };
    if (!r.ok) throw new Error(`resend ${r.status} ${j.name ?? ""}: ${j.message ?? ""}`);
    return j.id!;
  }
  throw new Error("resend: rate limited");
}

export async function resendDomainStatus(name: string) {
  const r = await fetch(`${API}/domains`, { headers: { Authorization: `Bearer ${key()}` } });
  const d = ((await r.json()).data as { id: string; name: string; status: string }[]).find(x => x.name === name);
  return d?.status ?? "missing";
}
