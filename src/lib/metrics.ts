import { sql } from "@/lib/db";

export type Period = 7 | 30 | 90 | 365;

/** Attribution: an order counts for the last email the contact clicked within 5 days before the order (Klaviyo's click window). */
export async function attributeOrders() {
  await sql`update orders o set attributed_send_id = s.send_id from (
      select distinct on (o2.id) o2.id as order_id, e.send_id
      from orders o2 join events e on e.contact_id = o2.contact_id and e.type = 'click' and e.send_id is not null
        and e.occurred_at <= o2.placed_at and e.occurred_at >= o2.placed_at - interval '5 days'
      where o2.attributed_send_id is null and o2.contact_id is not null and o2.placed_at > now() - interval '30 days'
      order by o2.id, e.occurred_at desc) s
    where o.id = s.order_id`;
}

export async function overview(days: Period) {
  const iv = `${days} days`;
  const [m] = await sql`select
      (select count(*)::int from send_queue where status='sent' and sent_at > now() - ${iv}::interval) as sent,
      (select count(distinct send_id)::int from events where type='delivery' and occurred_at > now() - ${iv}::interval) as delivered,
      (select count(distinct send_id)::int from events where type='open' and source='app' and occurred_at > now() - ${iv}::interval) as opened,
      (select count(distinct send_id)::int from events where type='click' and source='app' and occurred_at > now() - ${iv}::interval) as clicked,
      (select count(distinct send_id)::int from events where type='bounce' and occurred_at > now() - ${iv}::interval) as bounced,
      (select count(distinct send_id)::int from events where type='complaint' and occurred_at > now() - ${iv}::interval) as complaints,
      (select count(*)::int from events where type='unsubscribe' and occurred_at > now() - ${iv}::interval) as unsubscribes,
      (select coalesce(sum(total),0)::float from orders where attributed_send_id is not null and placed_at > now() - ${iv}::interval) as attributed_revenue,
      (select count(*)::int from orders where attributed_send_id is not null and placed_at > now() - ${iv}::interval) as attributed_orders,
      (select coalesce(sum(total),0)::float from orders where placed_at > now() - ${iv}::interval) as total_revenue,
      (select count(*)::int from orders where placed_at > now() - ${iv}::interval) as total_orders,
      (select count(*)::int from contacts where status='subscribed') as subscribers,
      (select count(*)::int from contacts where status='subscribed' and consent_at > now() - ${iv}::interval) as new_subscribers`;
  return m;
}

export async function byFlow(days: Period) {
  const iv = `${days} days`;
  // Separate aggregates per flow — joining events and orders together multiplied rows.
  return sql`select f.id, f.name, f.status,
      (select count(*) from send_queue q where q.flow_id = f.id and q.status = 'sent' and q.sent_at > now() - ${iv}::interval)::int as sent,
      (select count(distinct e.send_id) from events e join send_queue q on q.id = e.send_id where q.flow_id = f.id and q.sent_at > now() - ${iv}::interval and e.type = 'open' and e.source = 'app')::int as opened,
      (select count(distinct e.send_id) from events e join send_queue q on q.id = e.send_id where q.flow_id = f.id and q.sent_at > now() - ${iv}::interval and e.type = 'click' and e.source = 'app')::int as clicked,
      (select coalesce(sum(o.total), 0) from orders o join send_queue q on q.id = o.attributed_send_id where q.flow_id = f.id and q.sent_at > now() - ${iv}::interval)::float as revenue,
      (select count(*) from orders o join send_queue q on q.id = o.attributed_send_id where q.flow_id = f.id and q.sent_at > now() - ${iv}::interval)::int as orders
    from flows f order by revenue desc, sent desc`;
}

export async function byCampaign(days: Period) {
  const iv = `${days} days`;
  // Each metric is a separate aggregate so joins can't multiply rows (opens × clicks × orders).
  const rows = await sql`select c.id, c.name, c.subject, c.sent_at, c.recipient_count, c.source, c.klaviyo_stats,
      (select count(*) from send_queue q where q.campaign_id = c.id and q.status = 'sent')::int as sent,
      (select count(distinct e.send_id) from events e join send_queue q on q.id = e.send_id where q.campaign_id = c.id and e.type = 'open' and e.source = 'app')::int as opened,
      (select count(distinct e.send_id) from events e join send_queue q on q.id = e.send_id where q.campaign_id = c.id and e.type = 'click' and e.source = 'app')::int as clicked,
      (select count(distinct e.contact_id) from events e where e.campaign_id = c.id and e.type = 'unsubscribe')::int as unsubscribes,
      (select coalesce(sum(o.total), 0) from orders o join send_queue q on q.id = o.attributed_send_id where q.campaign_id = c.id)::float as revenue,
      (select count(*) from orders o join send_queue q on q.id = o.attributed_send_id where q.campaign_id = c.id)::int as orders
    from campaigns c
    where c.status = 'sent' and c.sent_at > now() - ${iv}::interval order by c.sent_at desc`;
  // Klaviyo-era campaigns carry their stats from Klaviyo's reporting API
  return rows.map(r => {
    const k = r.klaviyo_stats as Record<string, number> | null;
    if (r.source === "klaviyo" && k) return { ...r, sent: k.recipients ?? r.recipient_count ?? 0, opened: k.opens_unique ?? Math.round((k.open_rate ?? 0) * (k.recipients ?? 0)), clicked: k.clicks_unique ?? Math.round((k.click_rate ?? 0) * (k.recipients ?? 0)), unsubscribes: k.unsubscribes ?? 0, revenue: k.conversion_value ?? 0, orders: k.conversions ?? 0 };
    return r;
  });
}

export async function daily(days: Period) {
  const iv = `${days} days`;
  return sql`with d as (select generate_series(date_trunc('day', now() - ${iv}::interval), date_trunc('day', now()), '1 day') as day)
    select to_char(d.day, 'YYYY-MM-DD') as day,
      (select count(*)::int from send_queue q where q.status='sent' and date_trunc('day', q.sent_at) = d.day) as sent,
      (select coalesce(sum(total),0)::float from orders o where o.attributed_send_id is not null and date_trunc('day', o.placed_at) = d.day) as revenue,
      (select coalesce(sum(total),0)::float from orders o where date_trunc('day', o.placed_at) = d.day) as total_revenue
    from d order by d.day`;
}
