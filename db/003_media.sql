create table if not exists media (
  id              bigserial primary key,
  shopify_file_id text unique,
  url             text not null,
  filename        text not null,
  mime            text,
  width           int,
  height          int,
  bytes           int,
  folder          text not null default '',
  tags            text[] not null default '{}',
  source          text,            -- klaviyo, upload
  source_url      text unique,
  alt             text,
  created_at      timestamptz not null default now()
);
create index if not exists media_folder_idx on media(folder);
create index if not exists media_tags_idx on media using gin(tags);

alter table templates add column if not exists kind text not null default 'unlayer';  -- unlayer | html
alter table templates add column if not exists source text;                            -- klaviyo | null
alter table templates add column if not exists source_ref text unique;                 -- klaviyo template id
alter table templates add column if not exists subject text;
