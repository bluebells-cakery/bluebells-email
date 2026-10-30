alter table campaigns add column if not exists smart_sending boolean not null default true;
alter table contacts add column if not exists last_sent_at timestamptz;
create index if not exists contacts_last_sent_idx on contacts(last_sent_at);
