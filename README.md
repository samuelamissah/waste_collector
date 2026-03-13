Waste Collector is a Next.js + Supabase app for residents to request pickups, collectors to process them, and admins to manage bins/users.

## Getting Started

1) Install dependencies:

```bash
npm install
```

2) Configure environment variables:

- Copy `.env.example` to `.env.local`
- Fill in:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3) Apply Supabase SQL (run in Supabase SQL editor):

- `supabase_profiles_schema.sql`
- `supabase_pickup_requests_schema.sql`
- `supabase_pickup_requests_location.sql` (stores pickup locations for maps)
- `supabase_pickup_logs_schema.sql`
- `supabase_bins_code.sql` (if you want bin codes)
- `supabase_reports_table.sql` (creates reports table if missing)
- `supabase_reports_schema.sql` (enables report statuses)
- `supabase_admin_full_access.sql` (recommended for admin/collector policies)

4) Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Admin access (dev)

Hardcoding admin credentials is not supported. For local development you can enable a safe bootstrap:

- Set `ENABLE_DEV_ADMIN_BOOTSTRAP=1` in `.env.local`
- Log in and open `/dashboard`
- Click `Make me admin`

## Scripts

```bash
npm run lint
npm run build
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
