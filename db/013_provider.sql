alter table campaigns add column if not exists provider text;
alter table send_queue add column if not exists provider text;
insert into settings(key, value) values ('email_provider', 'resend') on conflict (key) do nothing;
