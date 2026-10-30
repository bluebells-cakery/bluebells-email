-- Bluebells EDM — initial schema

create extension if not exists citext;

create table if not exists contacts (
  id            bigserial primary key,
  email         citext not null unique,
  first_name    text,
  last_name     text,
  phone         text,
  shopify_customer_id bigint unique,
  klaviyo_profile_id  text unique,
  status        text not null default 'subscribed' check (status in ('subscribed','unsubscribed','suppressed','never_subscribed')),
  consent_source text,            -- shopify_checkout, signup_form, klaviyo_import, pos, manual
  consent_at    timestamptz,
  unsubscribed_at timestamptz,
  suppressed_reason text,         -- bounce, complaint, manual, klaviyo_import
  last_order_at timestamptz,
  order_count   int not null default 0,
  total_spent   numeric(12,2) not null default 0,
  last_open_at  timestamptz,
  last_click_at timestamptz,
  tags          text[] not null default '{}',
  attributes    jsonb not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists contacts_status_idx on contacts(status);
create index if not exists contacts_last_order_idx on contacts(last_order_at);
create index if not exists contacts_tags_idx on contacts using gin(tags);

create table if not exists suppressions (
  email      citext primary key,
  reason     text not null,       -- bounce, complaint, unsubscribe, klaviyo, manual
  source     text,
  created_at timestamptz not null default now()
);

create table if not exists templates (
  id         bigserial primary key,
  name       text not null,
  design     jsonb not null,      -- Unlayer design JSON
  html       text,                -- last exported HTML
  thumbnail_url text,
  is_brand_template boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists segments (
  id         bigserial primary key,
  name       text not null,
  definition jsonb not null,      -- rule tree evaluated to SQL
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists campaigns (
  id           bigserial primary key,
  name         text not null,
  subject      text,
  preview_text text,
  from_name    text,
  from_email   text,
  template_id  bigint references templates(id),
  design       jsonb,
  html         text,
  segment_id   bigint references segments(id),
  status       text not null default 'draft' check (status in ('draft','scheduled','sending','sent','cancelled')),
  scheduled_at timestamptz,
  sent_at      timestamptz,
  recipient_count int,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists flows (
  id          bigserial primary key,
  name        text not null,
  trigger     text not null,      -- signup, order_placed, checkout_started, winback
  definition  jsonb not null,     -- steps: [{type:'email'|'wait'|'condition', ...}]
  status      text not null default 'draft' check (status in ('draft','live','paused')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists flow_runs (
  id          bigserial primary key,
  flow_id     bigint not null references flows(id),
  contact_id  bigint not null references contacts(id),
  step_index  int not null default 0,
  next_at     timestamptz,
  status      text not null default 'active' check (status in ('active','done','cancelled')),
  context     jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
create index if not exists flow_runs_due_idx on flow_runs(next_at) where status = 'active';

create table if not exists send_queue (
  id           bigserial primary key,
  contact_id   bigint not null references contacts(id),
  campaign_id  bigint references campaigns(id),
  flow_id      bigint references flows(id),
  flow_run_id  bigint references flow_runs(id),
  subject      text not null,
  html         text not null,
  from_name    text,
  from_email   text,
  status       text not null default 'queued' check (status in ('queued','sending','sent','failed','skipped')),
  attempts     int not null default 0,
  send_after   timestamptz not null default now(),
  sent_at      timestamptz,
  ses_message_id text,
  error        text,
  created_at   timestamptz not null default now()
);
create index if not exists send_queue_due_idx on send_queue(send_after) where status = 'queued';

create table if not exists events (
  id          bigserial primary key,
  contact_id  bigint references contacts(id),
  send_id     bigint references send_queue(id),
  campaign_id bigint references campaigns(id),
  flow_id     bigint references flows(id),
  type        text not null,      -- sent, delivered, open, click, bounce, complaint, unsubscribe, order
  url         text,
  meta        jsonb not null default '{}',
  occurred_at timestamptz not null default now()
);
create index if not exists events_contact_idx on events(contact_id, occurred_at);
create index if not exists events_send_idx on events(send_id);
create index if not exists events_type_idx on events(type, occurred_at);

create table if not exists orders (
  id          bigserial primary key,
  shopify_order_id bigint unique not null,
  contact_id  bigint references contacts(id),
  email       citext,
  total       numeric(12,2) not null,
  placed_at   timestamptz not null,
  attributed_send_id bigint references send_queue(id),
  created_at  timestamptz not null default now()
);
create index if not exists orders_contact_idx on orders(contact_id, placed_at);

create table if not exists migrations (
  name text primary key,
  applied_at timestamptz not null default now()
);
