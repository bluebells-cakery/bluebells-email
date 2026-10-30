export const dynamic = "force-dynamic";
import Link from "next/link";
import { byProvider, subscribersByProvider, sesHealth, recentIssues } from "@/lib/deliverability";

const pct = (a: number, b: number) => (b ? ((100 * a) / b).toFixed(1) + "%" : "—");
export default async function Deliverability({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const { d } = await searchParams; const days = [7, 30, 90].includes(Number(d)) ? Number(d) : 30;
  const [prov, subs, ses, issues] = await Promise.all([byProvider(days), subscribersByProvider(), sesHealth().catch(() => null), recentIssues()]);
  const totalSent = prov.reduce((n, p) => n + p.sent, 0), totalB = prov.reduce((n, p) => n + p.bounced, 0), totalC = prov.reduce((n, p) => n + p.complaints, 0);
  const lastBounce = ses?.bounceRate.at(-1)?.v ?? null, lastComplaint = ses?.complaintRate.at(-1)?.v ?? null;
  const Tile = ({ l, v, s, warn }: { l: string; v: string; s?: string; warn?: boolean }) => <div className={`rounded-lg border p-4 ${warn ? "border-red-300 bg-red-50" : "border-black/10 bg-white"}`}><div className="text-xs uppercase tracking-wide text-black/50">{l}</div><div className="mt-1 text-2xl font-semibold tabular-nums">{v}</div>{s && <div className="text-xs text-black/50">{s}</div>}</div>;
  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="flex items-center gap-4"><Link href="/dashboard" className="text-sm text-black/50 hover:text-black">← Dashboard</Link><h1 className="text-2xl font-semibold">Deliverability</h1>
        <div className="flex gap-1 rounded-md border border-black/10 bg-white p-0.5 text-sm">{[7, 30, 90].map(p => <Link key={p} href={`/dashboard/deliverability?d=${p}`} className={`rounded px-3 py-1 ${p === days ? "bg-brand text-white" : "text-black/60 hover:bg-black/5"}`}>{p} days</Link>)}</div></div>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile l="Bounce rate" v={pct(totalB, totalSent)} s="keep under 2% (AWS pauses at 10%)" warn={totalSent > 100 && totalB / totalSent > 0.05} />
        <Tile l="Complaint rate" v={pct(totalC, totalSent)} s="keep under 0.1% (Gmail's line is 0.3%)" warn={totalSent > 100 && totalC / totalSent > 0.001} />
        <Tile l="AWS reputation · bounce" v={lastBounce == null ? "—" : (100 * lastBounce).toFixed(2) + "%"} s={ses ? `account ${ses.production ? "production" : "sandbox"} · ${ses.enforcement ?? "healthy"}` : "AWS unavailable"} warn={lastBounce != null && lastBounce > 0.05} />
        <Tile l="AWS reputation · complaint" v={lastComplaint == null ? "—" : (100 * lastComplaint).toFixed(3) + "%"} s={ses?.quota ? `${ses.quota.Max24HourSend?.toLocaleString()} / 24h · ${ses.quota.MaxSendRate}/s` : ""} warn={lastComplaint != null && lastComplaint > 0.001} />
      </div>

      <h2 className="mt-10 text-lg font-semibold">By mailbox provider <span className="text-sm font-normal text-black/50">— a drop in opens/clicks at one provider while others hold = that provider is spam-foldering us</span></h2>
      <table className="mt-3 w-full border-separate border-spacing-0 overflow-hidden rounded-lg border border-black/10 bg-white text-sm">
        <thead className="bg-black/[.03] text-left text-xs uppercase tracking-wide text-black/50"><tr><th className="px-4 py-2">Provider</th><th className="px-4 py-2 text-right">Subscribers</th><th className="px-4 py-2 text-right">Sent</th><th className="px-4 py-2 text-right">Delivered</th><th className="px-4 py-2 text-right">Open</th><th className="px-4 py-2 text-right">Click</th><th className="px-4 py-2 text-right">Bounce</th><th className="px-4 py-2 text-right">Complaint</th></tr></thead>
        <tbody>{(prov.length ? prov : subs.map(s => ({ provider: s.provider, subscribers: s.n, sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, complaints: 0 }))).map(p => (
          <tr key={p.provider} className="border-t border-black/5"><td className="px-4 py-2 font-medium">{p.provider}</td><td className="px-4 py-2 text-right tabular-nums">{Number(p.subscribers).toLocaleString()}</td><td className="px-4 py-2 text-right tabular-nums">{p.sent.toLocaleString()}</td><td className="px-4 py-2 text-right tabular-nums">{pct(p.delivered, p.sent)}</td><td className="px-4 py-2 text-right tabular-nums">{pct(p.opened, p.sent)}</td><td className="px-4 py-2 text-right tabular-nums">{pct(p.clicked, p.sent)}</td><td className={`px-4 py-2 text-right tabular-nums ${p.sent > 50 && p.bounced / p.sent > 0.05 ? "text-red-600" : ""}`}>{pct(p.bounced, p.sent)}</td><td className={`px-4 py-2 text-right tabular-nums ${p.sent > 50 && p.complaints / p.sent > 0.001 ? "text-red-600" : ""}`}>{pct(p.complaints, p.sent)}</td></tr>))}</tbody>
      </table>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <section className="rounded-lg border border-black/10 bg-white p-5 text-sm">
          <h2 className="font-medium">Gmail Postmaster Tools <span className="text-xs font-normal text-black/50">— the only direct view of Gmail's spam rate and domain reputation</span></h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-black/70">
            <li>Open <a href="https://postmaster.google.com" target="_blank" className="text-brand hover:underline">postmaster.google.com</a> with the Google account that manages Google Ads → <b>+</b> → add domain <code>mail.bluebellscakery.co.nz</code>.</li>
            <li>It gives a TXT record — add it in the DNS panel as Sub Domain <code>mail</code>, Value <code>google-site-verification=…</code>, then click Verify.</li>
            <li>Data appears after a few days of sending 100+ Gmail emails/day: watch <b>Spam rate</b> (keep &lt; 0.1%) and <b>Domain reputation</b> (High / Medium is fine; Low / Bad = pause and investigate).</li>
          </ol>
          <p className="mt-2 text-xs text-black/50">Microsoft's equivalent is SNDS (sendersupport.olc.protection.outlook.com/snds) — needs the SES IP range; lower value since few customers are on Outlook.</p>
        </section>
        <section className="rounded-lg border border-black/10 bg-white p-5 text-sm">
          <h2 className="font-medium">Recent bounces &amp; complaints</h2>
          {issues.length === 0 ? <p className="mt-2 text-black/50">None recorded.</p> : <ul className="mt-2 space-y-1 text-xs">{issues.map((i, k) => <li key={k} className="flex gap-2"><span className={`rounded px-1.5 ${i.type === "complaint" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>{i.type}</span><span className="truncate">{String(i.recipients ?? "").replace(/[\[\]"]/g, "")}</span><span className="text-black/40">{i.subject}</span><span className="ml-auto whitespace-nowrap text-black/40">{new Date(i.occurred_at).toLocaleString("en-NZ")}</span></li>)}</ul>}
          <p className="mt-3 text-xs text-black/50">Every bounce/complaint is suppressed automatically. Alert: if the 24h complaint rate passes 0.1% or bounce rate 5%, the engine pauses campaign sends (flows continue) — you'll see it flagged red here and on the Flows page.</p>
        </section>
      </div>
      <h2 className="mt-10 text-lg font-semibold">What keeps us in the inbox</h2>
      <ul className="mt-2 grid gap-2 text-sm text-black/70 md:grid-cols-2">
        <li className="rounded-lg border border-black/10 bg-white p-3">✅ SPF, DKIM (2048-bit) and DMARC on mail.bluebellscakery.co.nz; custom MAIL FROM aligned</li>
        <li className="rounded-lg border border-black/10 bg-white p-3">✅ One-click List-Unsubscribe headers + footer link (Gmail/Yahoo bulk-sender rule)</li>
        <li className="rounded-lg border border-black/10 bg-white p-3">✅ Suppression list carried over (bounces, complaints, unsubscribes) and enforced on every send</li>
        <li className="rounded-lg border border-black/10 bg-white p-3">✅ Smart sending cap · real text + links in every email (never image-only)</li>
        <li className="rounded-lg border border-black/10 bg-white p-3">⏳ Warm-up: first campaigns go to the Engaged-30 segment only, then widen over 4–6 weeks</li>
        <li className="rounded-lg border border-black/10 bg-white p-3">⏳ Sunset: stop emailing the never-engaged segment (1,000+ people) — it drags reputation down</li>
      </ul>
    </div>
  );
}
