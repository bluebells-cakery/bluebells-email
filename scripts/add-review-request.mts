import { sql } from "../src/lib/db";
const [pp] = await sql`select id, definition, name from flows where name = 'Post Purchase'`;
const [tpl] = await sql`select html from templates where name like 'Post Purchase%Thank you%' limit 1`;
// Reuse the thank-you email's header/footer chrome by swapping its body? Simpler: a clean brand-consistent email.
const logo = (await sql`select url from media where filename ilike '%logo%' order by width desc nulls last limit 1`)[0]?.url ?? "https://edm.bluebellscakery.co.nz/brand/logo.png";
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>How was it?</title>
<link href="https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400&family=Poppins:wght@400;600&display=swap" rel="stylesheet"></head>
<body style="margin:0;padding:0;background:#fffdf8;font-family:Poppins,Arial,Helvetica,sans-serif;color:#262967">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fffdf8"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td align="center" style="background:#fbe7e6;padding:28px 24px"><img src="${logo}" alt="Bluebells Cakery" width="140" style="display:block;width:140px;height:auto"></td></tr>
<tr><td style="padding:36px 32px 8px;text-align:center"><h1 style="margin:0 0 12px;font-family:'Crimson Pro',Georgia,'Times New Roman',serif;font-weight:400;font-size:40px;line-height:1.1">How was it, {{ person.first_name|default:'friend' }}?</h1>
<p style="margin:0;font-size:16px;line-height:1.5">We hope everything from order {{ order.name }} went down a treat. Would you spare 30 seconds to tell us (and other cake lovers) what you thought? Every review helps our little bakery.</p></td></tr>
{% for item in order.line_items %}
<tr><td style="padding:12px 32px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0e6e4;border-radius:12px"><tr>
<td width="120" style="padding:12px"><a href="{{ item.url }}"><img src="{{ item.image }}" alt="{{ item.title }}" width="110" style="display:block;width:110px;height:110px;object-fit:cover;border-radius:8px"></a></td>
<td style="padding:12px 16px 12px 4px;vertical-align:middle"><div style="font-size:16px;font-weight:600;line-height:1.3;margin-bottom:10px">{{ item.title }}</div>
<a href="{{ item.review_url }}" style="display:inline-block;background:#00bfb3;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:10px 20px;border-radius:30px">Write a review</a></td></tr></table></td></tr>
{% endfor %}
<tr><td style="padding:20px 32px 36px;text-align:center"><p style="margin:0;font-size:14px;line-height:1.5;color:#6b6b7a">Had a problem? Please reply to this email — we'd much rather fix it than see it in a review.</p></td></tr>
<tr><td style="background:#fff9ea;padding:20px 24px;text-align:center;font-size:12px;line-height:1.6;color:#6b6b7a">{{ organization.name }} · Kingsland · Commercial Bay · Auckland Airport<br>{% unsubscribe %} · © {% current_year %}</td></tr>
</table></td></tr></table></body></html>`;
const subject = "How was it, {{ person.first_name|default:'friend' }}?";
const [t] = await sql`insert into templates (name, design, html, kind, source, subject, preview_text, from_name) values ('Post Purchase · Review request', '{}'::jsonb, ${html}, 'html', 'edm', ${subject}, 'A quick word about your Bluebells order', 'Bluebells Cakery') returning id`;
const def = pp.definition; const last = def.steps.find((s: any) => s.email && !s.links.next) ?? def.steps[def.steps.length - 1];
const waitId = "rr-wait", emailId = "rr-email";
def.steps = def.steps.filter((s: any) => s.id !== waitId && s.id !== emailId);
last.links.next = waitId;
def.steps.push({ id: waitId, type: "wait-until", links: { next: emailId }, waitUntil: { days: 7, from: "order.fulfil_date", time: "10:00" } });
def.steps.push({ id: emailId, type: "send-email", links: { next: null }, email: { name: "Email 2: Review request (Judge.me)", subject, previewText: "A quick word about your Bluebells order", templateId: t.id, status: "live", enabled: true } });
await sql`update flows set definition = ${JSON.stringify(def)}::jsonb, updated_at = now() where id = ${pp.id}`;
console.log("added review request to Post Purchase; template", t.id, "steps:", def.steps.map((s: any) => s.type).join(" → "));
