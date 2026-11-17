alter table users add column if not exists login_code_hash text;
alter table users add column if not exists login_code_expires timestamptz;
alter table users add column if not exists login_code_sent_at timestamptz;
