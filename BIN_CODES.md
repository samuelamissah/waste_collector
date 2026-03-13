## What is a bin code?
A bin code is a human-friendly identifier for a physical waste bin, like `BIN-0001`.

In this app:
- The bin code is stored in Supabase as `bins.code`
- The bin’s database ID is `bins.id` (a UUID)

When a resident requests a pickup:
- If they enter a bin code, the app looks up `bins.id` by matching `bins.code`
- Then it stores the request as `pickup_requests.bin_id = bins.id`
- If they do not have a bin code, they can enter an address instead

## Why you see “No bin found for BIN-001”
That message happens when the app cannot find any row in `bins` where `code` matches what you typed.

Common causes:
- The bin does not exist in the `bins` table yet
- The code is different (for example you typed `BIN-001` but the stored code is `BIN-0001`)
- Row Level Security is blocking reads on `bins` (it can look like “no results”)

## Setup checklist
1) Ensure the `bins.code` column exists
- Run: `supabase_bins_code.sql`

2) Add a bin row with a code
- In Supabase Table Editor → `bins` → Insert row → set `code` to `BIN-0001` (or whatever you want)

3) If bin lookup still returns nothing, allow authenticated users to read bins
- Run: `supabase_bins_rls.sql`

## QR code contents
For the MVP, your QR code can simply contain the text bin code (example `BIN-0001`).
The collector can scan it and type it into the verification field.

