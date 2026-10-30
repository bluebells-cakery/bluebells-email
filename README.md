# Bluebells EDM

Bluebells Cakery's in-house email marketing platform (Klaviyo replacement).

- App: https://edm.bluebellscakery.co.nz
- Stack: Next.js (App Router, TypeScript, Tailwind) on Vercel · Neon Postgres · Amazon SES · Unlayer editor · Shopify Files for media
- Transactional email (orders, vouchers) stays in Bluebells Ops — out of scope here.

## Dev

```
npm install
cp .env.example .env.local   # fill in values
npm run dev
```
