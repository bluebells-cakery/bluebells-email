export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { translate } from "@/lib/rules";
import { CampaignEditor } from "./editor";

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [c] = await sql`select * from campaigns where id = ${id}`;
  if (!c) notFound();
  const templates = await sql`select id, name, kind, subject, updated_at from templates order by (kind='unlayer') desc, updated_at desc`;
  const segs = (await sql`select id, name, definition, klaviyo_count from segments order by sort_order, name`).map(s => ({ id: Number(s.id), name: s.name as string, supported: translate(s.definition).supported }));
  const [stats] = await sql`select count(*) filter (where status='sent')::int sent, count(*) filter (where status='queued')::int queued, count(*) filter (where status='skipped')::int skipped, count(*) filter (where status='failed')::int failed from send_queue where campaign_id = ${id}`;
  return <CampaignEditor campaign={JSON.parse(JSON.stringify(c))} templates={JSON.parse(JSON.stringify(templates))} segments={segs} stats={stats as { sent: number; queued: number; skipped: number; failed: number }} />;
}
