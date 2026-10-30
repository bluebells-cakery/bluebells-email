create table if not exists coupons (
  code        text primary key,
  pool        text not null,            -- e.g. WELCOME10
  discount_id text not null,            -- Shopify DiscountCodeNode gid
  expires_at  timestamptz not null,
  contact_id  bigint references contacts(id),
  assigned_at timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists coupons_pool_free_idx on coupons(pool, expires_at) where contact_id is null;
create unique index if not exists coupons_contact_pool_idx on coupons(contact_id, pool) where contact_id is not null;
