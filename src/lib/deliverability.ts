import { sql } from "@/lib/db";
import { SESv2Client, GetAccountCommand } from "@aws-sdk/client-sesv2";
import { CloudWatchClient, GetMetricStatisticsCommand } from "@aws-sdk/client-cloudwatch";

export const providerOf = (email: string) => {
  const d = email.split("@")[1]?.toLowerCase() ?? "";
  if (/gmail|googlemail/.test(d)) return "Gmail";
  if (/outlook|hotmail|live\.|msn\.|xtra\.co\.nz/.test(d)) return d.includes("xtra") ? "Xtra" : "Outlook / Hotmail";
  if (/yahoo|ymail/.test(d)) return "Yahoo";
  if (/icloud|me\.com|mac\.com/.test(d)) return "Apple iCloud";
  return "Other";
};

export async function byProvider(days: number) {
  const rows = await sql`select
      case when c.email ilike '%@gmail.%' or c.email ilike '%@googlemail.%' then 'Gmail'
           when c.email ilike '%@xtra.co.nz' then 'Xtra'
           when c.email ilike '%@outlook.%' or c.email ilike '%@hotmail.%' or c.email ilike '%@live.%' or c.email ilike '%@msn.%' then 'Outlook / Hotmail'
           when c.email ilike '%@yahoo.%' or c.email ilike '%@ymail.%' then 'Yahoo'
           when c.email ilike '%@icloud.%' or c.email ilike '%@me.com' or c.email ilike '%@mac.com' then 'Apple iCloud' else 'Other' end as provider,
      count(*) filter (where q.status='sent')::int sent,
      count(*) filter (where exists (select 1 from events e where e.send_id = q.id and e.type='delivery'))::int delivered,
      count(*) filter (where exists (select 1 from events e where e.send_id = q.id and e.type='bounce'))::int bounced,
      count(*) filter (where exists (select 1 from events e where e.send_id = q.id and e.type='complaint'))::int complaints,
      count(*) filter (where exists (select 1 from events e where e.send_id = q.id and e.type='open' and e.source='app'))::int opened,
      count(*) filter (where exists (select 1 from events e where e.send_id = q.id and e.type='click' and e.source='app'))::int clicked,
      (select count(*)::int from contacts c2 where c2.status='subscribed' and
        (case when c2.email ilike '%@gmail.%' or c2.email ilike '%@googlemail.%' then 'Gmail' when c2.email ilike '%@xtra.co.nz' then 'Xtra' when c2.email ilike '%@outlook.%' or c2.email ilike '%@hotmail.%' or c2.email ilike '%@live.%' or c2.email ilike '%@msn.%' then 'Outlook / Hotmail' when c2.email ilike '%@yahoo.%' or c2.email ilike '%@ymail.%' then 'Yahoo' when c2.email ilike '%@icloud.%' or c2.email ilike '%@me.com' or c2.email ilike '%@mac.com' then 'Apple iCloud' else 'Other' end) =
        (case when c.email ilike '%@gmail.%' or c.email ilike '%@googlemail.%' then 'Gmail' when c.email ilike '%@xtra.co.nz' then 'Xtra' when c.email ilike '%@outlook.%' or c.email ilike '%@hotmail.%' or c.email ilike '%@live.%' or c.email ilike '%@msn.%' then 'Outlook / Hotmail' when c.email ilike '%@yahoo.%' or c.email ilike '%@ymail.%' then 'Yahoo' when c.email ilike '%@icloud.%' or c.email ilike '%@me.com' or c.email ilike '%@mac.com' then 'Apple iCloud' else 'Other' end)) as subscribers
    from send_queue q join contacts c on c.id = q.contact_id where q.sent_at > now() - (${days} || ' days')::interval
    group by 1 order by subscribers desc`;
  return rows;
}

export async function subscribersByProvider() {
  return sql`select case when email ilike '%@gmail.%' or email ilike '%@googlemail.%' then 'Gmail' when email ilike '%@xtra.co.nz' then 'Xtra' when email ilike '%@outlook.%' or email ilike '%@hotmail.%' or email ilike '%@live.%' or email ilike '%@msn.%' then 'Outlook / Hotmail' when email ilike '%@yahoo.%' or email ilike '%@ymail.%' then 'Yahoo' when email ilike '%@icloud.%' or email ilike '%@me.com' or email ilike '%@mac.com' then 'Apple iCloud' else 'Other' end as provider, count(*)::int n
    from contacts where status='subscribed' group by 1 order by 2 desc`;
}

export async function sesHealth() {
  const region = process.env.AWS_REGION ?? "ap-southeast-2";
  const ses = new SESv2Client({ region }); const cw = new CloudWatchClient({ region });
  const acct = await ses.send(new GetAccountCommand({}));
  const stat = async (metric: string) => {
    try {
      const r = await cw.send(new GetMetricStatisticsCommand({ Namespace: "AWS/SES", MetricName: metric, StartTime: new Date(Date.now() - 14 * 86400e3), EndTime: new Date(), Period: 86400, Statistics: ["Average"] }));
      return (r.Datapoints ?? []).sort((a, b) => a.Timestamp!.getTime() - b.Timestamp!.getTime()).map(d => ({ day: d.Timestamp!.toISOString().slice(0, 10), v: d.Average ?? 0 }));
    } catch { return []; }
  };
  return { production: acct.ProductionAccessEnabled, quota: acct.SendQuota, enforcement: acct.EnforcementStatus, review: acct.Details?.ReviewDetails?.Status,
    bounceRate: await stat("Reputation.BounceRate"), complaintRate: await stat("Reputation.ComplaintRate") };
}

export async function recentIssues() {
  return sql`select e.type, e.occurred_at, e.meta->>'recipients' as recipients, q.subject from events e left join send_queue q on q.id = e.send_id where e.type in ('bounce','complaint','reject') order by e.occurred_at desc limit 30`;
}
