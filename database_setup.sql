-- Add send_24h_reminder column to events table
ALTER TABLE events
ADD COLUMN IF NOT EXISTS send_24h_reminder boolean DEFAULT false;

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
-- Add custom reminder fields to events table
ALTER TABLE events
ADD COLUMN IF NOT EXISTS custom_reminder_hours integer,
ADD COLUMN IF NOT EXISTS reminder_note text;
-- Add the new column to the events table
ALTER TABLE public.events
ADD COLUMN confirmation_email_hours INTEGER;

-- Update existing records to have it disabled by default
UPDATE public.events
SET confirmation_email_hours = 0
WHERE confirmation_email_hours IS NULL;

-- Check the slug and id for all events to verify they match what is expected.
select id, title, slug, created_at 
from public.events 
order by created_at desc;

-- 1. Create a trigger function to handle new user signups
-- This function runs automatically whenever a new user is created in auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, organization_name, avatar_url)
  values (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'organization_name', 
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

-- 2. Create the trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. Fix existing users (Backfill)
-- This inserts a profile for any existing user that doesn't have one
insert into public.profiles (id, full_name, organization_name)
select 
  id, 
  coalesce(raw_user_meta_data->>'full_name', 'User'), 
  coalesce(raw_user_meta_data->>'organization_name', 'Organization')
from auth.users
where id not in (select id from public.profiles);
-- Enable RLS on registrations table (ensure it is on)
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can register." ON registrations;
DROP POLICY IF EXISTS "Anyone can register" ON registrations;

-- Create permissive INSERT policy
CREATE POLICY "Anyone can register"
ON registrations
FOR INSERT
WITH CHECK (true);

-- Ensure anon and authenticated roles can insert
GRANT INSERT ON registrations TO postgres, anon, authenticated, service_role;

-- aEnable UUID extension
crete extension if not exists "uuid-ossp";

-- Profiles table
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  updated_at timestamp with time zone,
  full_name text,
  organization_name text,
  website text,
  avatar_url text
);

-- Events table
create table events (
  id uuid default uuid_generate_v4() primary key,
  organizer_id uuid references profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text not null,
  description text,
  event_type text check (event_type in ('online', 'in-person')) not null,
  location text, -- URL for online, Address for in-person
  start_date date not null,
  start_time time not null,
  end_date date,
  end_time time,
  registration_deadline timestamp with time zone,
  capacity integer,
  current_registrations integer default 0
);

-- Registrations table
create table registrations (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references events(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  full_name text not null,
  email text not null,
  phone text,
  status text not null, -- attended, registered, cancelled
  professional_status text
);

-- Row Level Security (RLS)

-- Profiles: 
-- Public read access (for showing organizer name on public event pages) -> actually maybe restricted?
-- For now, let's allow public read of basic profile info if needed, but strict update.
alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Events:
-- Public read access for all events (or at least those with a link).
-- Organizer create/update/delete their own events.
alter table events enable row level security;

create policy "Events are viewable by everyone."
  on events for select
  using ( true );

create policy "Organizers can insert their own events."
  on events for insert
  with check ( auth.uid() = organizer_id );

create policy "Organizers can update their own events."
  on events for update
  using ( auth.uid() = organizer_id );

create policy "Organizers can delete their own events."
  on events for delete
  using ( auth.uid() = organizer_id );

-- Registrations:
-- Public insert (for registering).
-- Organizers can view registrations for their events.
alter table registrations enable row level security;

create policy "Anyone can register."
  on registrations for insert
  with check ( true );

create policy "Organizers can view registrations for their own events."
  on registrations for select
  using ( exists (
    select 1 from events
    where events.id = registrations.event_id
    and events.organizer_id = auth.uid()
  ));

-- Function to update registration count
create or replace function public.update_event_registration_count()
returns trigger
language plpgsql
security definer
as $$
begin
  if (TG_OP = 'INSERT') then
    update public.events
    set current_registrations = current_registrations + 1
    where id = new.event_id;
    return new;
  elsif (TG_OP = 'DELETE') then
    update public.events
    set current_registrations = current_registrations - 1
    where id = old.event_id;
    return old;
  end if;
  return null;
end;
$$;

-- Trigger for new registrations
drop trigger if exists on_registration_change on public.registrations;
create trigger on_registration_change
  after insert or delete on public.registrations
  for each row execute procedure public.update_event_registration_count();
