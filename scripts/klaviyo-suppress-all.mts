// Suppress every active Klaviyo profile (user_suppressed) so the account can drop to the free plan.
// Reversible via /api/profile-suppression-bulk-delete-jobs. Run: npx tsx --env-file=.env.local scripts/klaviyo-suppress-all.mts
const KEY = process.env.KLAVIYO_PRIVATE_KEY!;
const H = { Authorization: `Klaviyo-API-Key ${KEY}`, revision: "2025-10-15", accept: "application/json", "content-type": "application/json" };
const DRY = process.argv.includes("--dry");

async function k(url: string, init?: RequestInit): Promise<any> {
  for (let i = 0; i < 6; i++) {
    const r = await fetch(url, { ...init, headers: { ...H, ...(init?.headers ?? {}) } });
    if (r.status === 429 || r.status >= 500) { await new Promise(s => setTimeout(s, 1500 * (i + 1))); continue; }
    if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
    return r.status === 204 ? null : r.json();
  }
  throw new Error("retries exhausted " + url);
}

async function suppress(emails: string[]) {
  if (!emails.length || DRY) return;
  await k("https://a.klaviyo.com/api/profile-suppression-bulk-create-jobs", { method: "POST", body: JSON.stringify({ data: { type: "profile-suppression-bulk-create-job", attributes: { profiles: { data: emails.map(email => ({ type: "profile", attributes: { email } })) } } } }) });
}

let url: string | null = "https://a.klaviyo.com/api/profiles?page[size]=100&additional-fields[profile]=subscriptions&fields[profile]=email,subscriptions";
let seen = 0, active = 0, batch: string[] = [], jobs = 0;
while (url) {
  const page = await k(url);
  for (const p of page.data) {
    seen++;
    const em = p.attributes.email; if (!em) continue;
    const sup = p.attributes.subscriptions?.email?.marketing?.suppression ?? [];
    if (sup.length) continue; // already suppressed (bounce/complaint/user)
    active++; batch.push(em);
    if (batch.length === 100) { await suppress(batch); batch = []; jobs++; }
  }
  url = page.links?.next ?? null;
  if (seen % 5000 === 0) console.log(`seen ${seen}, active ${active}, jobs ${jobs}`);
}
if (batch.length) { await suppress(batch); jobs++; }
console.log(`DONE seen ${seen}, active ${active}, jobs ${jobs}${DRY ? " (dry)" : ""}`);
