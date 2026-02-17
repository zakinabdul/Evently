
-- 1. Add slug column to events table
alter table public.events 
add column if not exists slug text;

-- 2. Add unique constraint to slug
alter table public.events 
add constraint events_slug_key unique (slug);

-- 3. Create a function to generate random slugs (simple version)
-- Note: In a real production app, we might use a more robust ID generator (like nanoid) in application logic, 
-- but for backfilling existing rows, a simple substring or random string works.

-- Backfill existing events with a default slug (using the first 8 chars of uuid if slug is null)
update public.events
set slug = substring(id::text from 1 for 8)
where slug is null;

-- 4. Enable RLS on this column if needed (already covered by table policy)
-- Policies usually cover "all columns" so no change needed.

-- 5. Add index for faster lookup
create index if not exists events_slug_idx on public.events (slug);
