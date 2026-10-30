create extension if not exists pgcrypto;
-- flow engine
alter table flows add column if not exists entry_step text;
alter table flow_runs add column if not exists step_id text;           -- current step id in definition
alter table flow_runs add column if not exists trigger_ref text;       -- e.g. order id / checkout token, for idempotency
alter table flow_runs add column if not exists finished_at timestamptz;
create unique index if not exists flow_runs_unique_trigger on flow_runs(flow_id, contact_id, trigger_ref) where trigger_ref is not null;
alter table send_queue add column if not exists template_id bigint references templates(id);
alter table send_queue add column if not exists step_id text;
alter table send_queue add column if not exists token text unique;      -- for open/click/unsubscribe links
alter table send_queue add column if not exists preview_text text;
alter table contacts add column if not exists unsubscribe_token text unique;
create table if not exists sync_state (key text primary key, value text not null, updated_at timestamptz not null default now());
create table if not exists checkouts (
  token text primary key, shopify_checkout_id bigint, email citext, contact_id bigint references contacts(id),
  abandoned_url text, line_items jsonb not null default '[]', total numeric(12,2), created_at timestamptz, updated_at timestamptz,
  completed_at timestamptz, recovered boolean not null default false, imported_at timestamptz not null default now());
create index if not exists checkouts_contact_idx on checkouts(contact_id, created_at);
alter table orders add column if not exists checkout_token text;
alter table orders add column if not exists line_items jsonb;
alter table orders add column if not exists first_name text;
