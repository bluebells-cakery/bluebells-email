alter table contacts add column if not exists city text;
alter table contacts add column if not exists country text;
create index if not exists contacts_city_idx on contacts(city);
alter table events add column if not exists source text;        -- ses, klaviyo, app
alter table events add column if not exists source_id text unique;
