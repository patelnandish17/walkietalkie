-- ============================================================================
-- SQUAWK WALKIE-TALKIE: SUPABASE POSTGRES SCHEMA, RLS & STORAGE MIGRATION
-- Migration Version: 20261104_init_squawk.sql
-- ============================================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. Profiles Table (Linked to auth.users)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  display_name text not null,
  avatar_url text,
  accent_color text not null default '#38bdf8',
  created_at timestamptz not null default now()
);

-- Trigger to auto-create profile on Supabase auth.users signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url, accent_color)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Station Operator'),
    coalesce(new.raw_user_meta_data->>'avatar_url', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'),
    '#38bdf8'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 2. Channels Table
-- ----------------------------------------------------------------------------
create table if not exists public.channels (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  emoji text not null default '📻',
  invite_code text not null unique,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz not null default now()
);

-- Index on invite_code for quick lookup
create index if not exists idx_channels_invite_code on public.channels(invite_code);
create index if not exists idx_channels_owner_id on public.channels(owner_id);

-- ----------------------------------------------------------------------------
-- 3. Channel Members Table
-- ----------------------------------------------------------------------------
create table if not exists public.channel_members (
  channel_id uuid references public.channels(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text not null default 'member' check (role in ('owner', 'member')),
  muted boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (channel_id, user_id)
);

create index if not exists idx_channel_members_user on public.channel_members(user_id);

-- ----------------------------------------------------------------------------
-- 4. Transmissions (Voice Clips) Table
-- ----------------------------------------------------------------------------
create table if not exists public.transmissions (
  id uuid default gen_random_uuid() primary key,
  channel_id uuid references public.channels(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  audio_path text not null,
  duration_ms integer not null check (duration_ms > 0 and duration_ms <= 65000),
  mime_type text not null default 'audio/webm',
  created_at timestamptz not null default now()
);

create index if not exists idx_transmissions_channel_created on public.transmissions(channel_id, created_at desc);

-- ----------------------------------------------------------------------------
-- 5. Transmission Listens Table (Track unread / listened clips)
-- ----------------------------------------------------------------------------
create table if not exists public.transmission_listens (
  transmission_id uuid references public.transmissions(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  listened_at timestamptz not null default now(),
  primary key (transmission_id, user_id)
);

create index if not exists idx_trans_listens_user on public.transmission_listens(user_id);

-- ----------------------------------------------------------------------------
-- 6. Row Level Security (RLS) Policies
-- ----------------------------------------------------------------------------

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.channels enable row level security;
alter table public.channel_members enable row level security;
alter table public.transmissions enable row level security;
alter table public.transmission_listens enable row level security;

-- Profiles: Authenticated users can view all profiles and update their own
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- Helper security function: Check channel membership
create or replace function public.is_channel_member(_channel_id uuid, _user_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.channel_members
    where channel_id = _channel_id and user_id = _user_id
  );
$$ language sql security definer;

-- Channels: Users can only select channels they belong to
create policy "Users can select channels they are members of"
  on public.channels for select
  to authenticated
  using (
    public.is_channel_member(id, auth.uid()) or owner_id = auth.uid()
  );

create policy "Authenticated users can create channels"
  on public.channels for insert
  to authenticated
  with check (auth.uid() = owner_id);

create policy "Owners can update their channels"
  on public.channels for update
  to authenticated
  using (auth.uid() = owner_id);

-- Channel Members: View members of channels you belong to
create policy "View channel members if you belong to channel"
  on public.channel_members for select
  to authenticated
  using (public.is_channel_member(channel_id, auth.uid()));

create policy "Join channel by creating membership"
  on public.channel_members for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Update own membership (e.g. mute toggle)"
  on public.channel_members for update
  to authenticated
  using (auth.uid() = user_id);

create policy "Leave channel by deleting membership"
  on public.channel_members for delete
  to authenticated
  using (auth.uid() = user_id);

-- Transmissions: Only members can read or post transmissions
create policy "Members can read transmissions in their channels"
  on public.transmissions for select
  to authenticated
  using (public.is_channel_member(channel_id, auth.uid()));

create policy "Members can upload transmissions in their channels"
  on public.transmissions for insert
  to authenticated
  with check (
    auth.uid() = sender_id and public.is_channel_member(channel_id, auth.uid())
  );

-- Transmission Listens
create policy "View and mark transmission listens"
  on public.transmission_listens for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 7. Supabase Storage: Voice Clips Bucket
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('voice_clips', 'voice_clips', true)
on conflict (id) do nothing;

create policy "Allow authenticated uploads to voice_clips"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'voice_clips');

create policy "Allow public reads from voice_clips"
  on storage.objects for select
  to public
  using (bucket_id = 'voice_clips');

-- ----------------------------------------------------------------------------
-- 8. Seed Script for Prototyping
-- ----------------------------------------------------------------------------
-- Optional test seed entries can be inserted via Supabase SQL Editor
