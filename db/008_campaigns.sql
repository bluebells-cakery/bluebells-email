alter table campaigns add column if not exists audience jsonb not null default '{"include":"subscribed","segment_ids":[],"exclude_segment_ids":[]}';
alter table campaigns add column if not exists source text;
alter table campaigns add column if not exists source_ref text unique;
alter table campaigns add column if not exists klaviyo_stats jsonb;
alter table campaigns add column if not exists queued_at timestamptz;
alter table campaigns add column if not exists utm text;
alter table segments add column if not exists description text;
