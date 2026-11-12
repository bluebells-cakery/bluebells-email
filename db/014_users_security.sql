create table if not exists users (
  id serial primary key, email text unique not null, name text, role text not null default 'staff',
  pw_hash text, totp_secret text, totp_enabled boolean not null default false,
  setup_token text, setup_expires timestamptz, failed_count int not null default 0, locked_until timestamptz,
  created_at timestamptz not null default now(), last_login_at timestamptz
);
insert into users (email, name, role) values ('ryan@bluebellscakery.co.nz', 'Ryan', 'owner') on conflict (email) do nothing;
alter table campaigns add column if not exists approved_by int;
alter table campaigns add column if not exists approved_at timestamptz;
alter table campaigns add column if not exists approval_sig text;
alter table send_queue add column if not exists sig text;
