create table if not exists forms (
  id         bigserial primary key,
  name       text not null,
  kind       text not null default 'popup' check (kind in ('popup','embed')),
  status     text not null default 'draft' check (status in ('draft','live')),
  config     jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists form_events (
  id bigserial primary key, form_id bigint references forms(id), type text not null, email citext, meta jsonb, occurred_at timestamptz not null default now());
create index if not exists form_events_idx on form_events(form_id, occurred_at);
