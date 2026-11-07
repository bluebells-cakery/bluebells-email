create table if not exists reviews (
  id bigserial primary key,
  send_id bigint references send_queue(id),
  contact_id bigint references contacts(id),
  order_name text,
  product_handle text not null,
  product_title text,
  product_image text,
  shopify_product_id bigint,
  rating int not null check (rating between 1 and 5),
  title text,
  body text,
  name text,
  email text,
  photos jsonb not null default '[]',
  status text not null default 'pending',
  judgeme_error text,
  created_at timestamptz not null default now(),
  pushed_at timestamptz,
  unique (send_id, product_handle)
);
create index if not exists reviews_created on reviews (created_at desc);
