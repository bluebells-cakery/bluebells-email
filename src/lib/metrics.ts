import { sql } from "@/lib/db";

export type Period = 7 | 30 | 90 | 365;

/** Attribution: an order counts for the last email the contact clicked within 5 days before the order (Klaviyo's click window). */
export async function attributeOrders() {
  await sql`update orders o set attributed_send_id = s.id from lateral (
      select q.id from events e join send_queue q on q.id = e.send_id
      where e.contact_id = o.contact_id and e.type = 'click' and e.occurred_at <= o.placed_at and e.occurred_at >= o.placed_at - interval '5 days'
      order by e.occurred_at desc limit 1) s
    where o.attributed_send_id is null and o.contact_id is not null and o.placed_at > now() - interval '30 days'`;
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
  return sql`select f.id, f.name, f.status,
      count(q.id) filter (where q.status='sent')::int as sent,
      count(distinct e_o.send_id)::int as opened, count(distinct e_c.send_id)::int as clicked,
      coalesce(sum(o.total),0)::float as revenue, count(distinct o.id)::int as orders
    from flows f
    left join send_queue q on q.flow_id = f.id and q.sent_at > now() - ${iv}::interval
    left join events e_o on e_o.send_id = q.id and e_o.type='open' and e_o.source='app'
    left join events e_c on e_c.send_id = q.id and e_c.type='click' and e_c.source='app'
    left join orders o on o.attributed_send_id = q.id
    group by f.id order by revenue desc, sent desc`;
}

export async function byCampaign(days: Period) {
  const iv = `${days} days`;
  return sql`select c.id, c.name, c.subject, c.sent_at, c.recipient_count,
      count(q.id) filter (where q.status='sent')::int as sent,
      count(distinct e_o.send_id)::int as opened, count(distinct e_c.send_id)::int as clicked,
      coalesce(sum(o.total),0)::float as revenue, count(distinct o.id)::int as orders
    from campaigns c
    left join send_queue q on q.campaign_id = c.id
    left join events e_o on e_o.send_id = q.id and e_o.type='open' and e_o.source='app'
    left join events e_c on e_c.send_id = q.id and e_c.type='click' and e_c.source='app'
    left join orders o on o.attributed_send_id = q.id
    where c.sent_at > now() - ${iv}::interval group by c.id order by c.sent_at desc`;
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
