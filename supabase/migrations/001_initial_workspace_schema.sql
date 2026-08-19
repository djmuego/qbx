-- QBX multi-tenant workspace schema (V1)
-- Run via Supabase CLI or SQL editor

create extension if not exists "pgcrypto";

-- Profiles (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  locale text default 'ru',
  active_workspace_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Workspaces (farm / account)
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My Farm',
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'operator', 'viewer', 'admin')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Business tables (JSONB payload = domain object)
create table if not exists public.spaces (
  id text not null,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, id)
);

create table if not exists public.devices (
  id text not null,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  space_id text,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, id)
);

create table if not exists public.automations (
  id text not null,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  space_id text,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, id)
);

create table if not exists public.spatial_maps (
  space_id text not null,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, space_id)
);

create table if not exists public.plants (
  id text not null,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  space_id text,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, id)
);

create table if not exists public.plant_groups (
  id text not null,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  space_id text,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, id)
);

create table if not exists public.user_preferences (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.agent_chats (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  space_id text not null,
  messages jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, space_id)
);

create table if not exists public.agent_analyses (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  space_id text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, space_id)
);

create table if not exists public.grow_journals (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  space_id text not null,
  entries jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, space_id)
);

create table if not exists public.crop_profiles (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  space_id text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, space_id)
);

-- Indexes
create index if not exists idx_spaces_workspace on public.spaces (workspace_id);
create index if not exists idx_devices_workspace on public.devices (workspace_id);
create index if not exists idx_automations_workspace on public.automations (workspace_id);
create index if not exists idx_plants_workspace on public.plants (workspace_id);
create index if not exists idx_workspace_members_user on public.workspace_members (user_id);

-- Helper: membership role
create or replace function public.workspace_role(ws_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select wm.role
  from public.workspace_members wm
  where wm.workspace_id = ws_id
    and wm.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.is_workspace_member(ws_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = ws_id and wm.user_id = auth.uid()
  );
$$;

-- RLS
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.platform_admins enable row level security;
alter table public.spaces enable row level security;
alter table public.devices enable row level security;
alter table public.automations enable row level security;
alter table public.spatial_maps enable row level security;
alter table public.plants enable row level security;
alter table public.plant_groups enable row level security;
alter table public.user_preferences enable row level security;
alter table public.agent_chats enable row level security;
alter table public.agent_analyses enable row level security;
alter table public.grow_journals enable row level security;
alter table public.crop_profiles enable row level security;

-- Profiles
create policy profiles_select on public.profiles for select using (id = auth.uid());
create policy profiles_update on public.profiles for update using (id = auth.uid());
create policy profiles_insert on public.profiles for insert with check (id = auth.uid());

-- Workspaces
create policy workspaces_select on public.workspaces for select using (public.is_workspace_member(id));
create policy workspaces_insert on public.workspaces for insert with check (owner_id = auth.uid());
create policy workspaces_update on public.workspaces for update
  using (public.workspace_role(id) in ('owner', 'admin'));
create policy workspaces_delete on public.workspaces for delete
  using (public.workspace_role(id) = 'owner');

-- Workspace members
create policy wm_select on public.workspace_members for select
  using (public.is_workspace_member(workspace_id));
create policy wm_insert on public.workspace_members for insert
  with check (public.workspace_role(workspace_id) in ('owner', 'admin'));
create policy wm_update on public.workspace_members for update
  using (public.workspace_role(workspace_id) in ('owner', 'admin'));
create policy wm_delete on public.workspace_members for delete
  using (public.workspace_role(workspace_id) in ('owner', 'admin'));

-- Generic read for members
create policy spaces_select on public.spaces for select using (public.is_workspace_member(workspace_id));
create policy devices_select on public.devices for select using (public.is_workspace_member(workspace_id));
create policy automations_select on public.automations for select using (public.is_workspace_member(workspace_id));
create policy maps_select on public.spatial_maps for select using (public.is_workspace_member(workspace_id));
create policy plants_select on public.plants for select using (public.is_workspace_member(workspace_id));
create policy groups_select on public.plant_groups for select using (public.is_workspace_member(workspace_id));
create policy prefs_select on public.user_preferences for select
  using (user_id = auth.uid() and public.is_workspace_member(workspace_id));
create policy chats_select on public.agent_chats for select using (public.is_workspace_member(workspace_id));
create policy analyses_select on public.agent_analyses for select using (public.is_workspace_member(workspace_id));
create policy journals_select on public.grow_journals for select using (public.is_workspace_member(workspace_id));
create policy crops_select on public.crop_profiles for select using (public.is_workspace_member(workspace_id));

-- Write: owner + operator (not viewer)
create policy spaces_write on public.spaces for all
  using (public.workspace_role(workspace_id) in ('owner', 'operator', 'admin'))
  with check (public.workspace_role(workspace_id) in ('owner', 'operator', 'admin'));
create policy devices_write on public.devices for all
  using (public.workspace_role(workspace_id) in ('owner', 'operator', 'admin'))
  with check (public.workspace_role(workspace_id) in ('owner', 'operator', 'admin'));
create policy automations_write on public.automations for all
  using (public.workspace_role(workspace_id) in ('owner', 'operator', 'admin'))
  with check (public.workspace_role(workspace_id) in ('owner', 'operator', 'admin'));
create policy maps_write on public.spatial_maps for all
  using (public.workspace_role(workspace_id) in ('owner', 'operator', 'admin'))
  with check (public.workspace_role(workspace_id) in ('owner', 'operator', 'admin'));
create policy plants_write on public.plants for all
  using (public.workspace_role(workspace_id) in ('owner', 'operator', 'admin'))
  with check (public.workspace_role(workspace_id) in ('owner', 'operator', 'admin'));
create policy groups_write on public.plant_groups for all
  using (public.workspace_role(workspace_id) in ('owner', 'operator', 'admin'))
  with check (public.workspace_role(workspace_id) in ('owner', 'operator', 'admin'));
create policy prefs_write on public.user_preferences for all
  using (user_id = auth.uid() and public.is_workspace_member(workspace_id))
  with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));
create policy chats_write on public.agent_chats for all
  using (public.workspace_role(workspace_id) in ('owner', 'operator', 'admin'))
  with check (public.workspace_role(workspace_id) in ('owner', 'operator', 'admin'));
create policy analyses_write on public.agent_analyses for all
  using (public.workspace_role(workspace_id) in ('owner', 'operator', 'admin'))
  with check (public.workspace_role(workspace_id) in ('owner', 'operator', 'admin'));
create policy journals_write on public.grow_journals for all
  using (public.workspace_role(workspace_id) in ('owner', 'operator', 'admin'))
  with check (public.workspace_role(workspace_id) in ('owner', 'operator', 'admin'));
create policy crops_write on public.crop_profiles for all
  using (public.workspace_role(workspace_id) in ('owner', 'operator', 'admin'))
  with check (public.workspace_role(workspace_id) in ('owner', 'operator', 'admin'));

-- Operator cannot delete spaces (owner only)
create policy spaces_delete_owner on public.spaces for delete
  using (public.workspace_role(workspace_id) in ('owner', 'admin'));

-- Signup bootstrap
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ws_id uuid;
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));

  insert into public.workspaces (name, owner_id)
  values ('My Farm', new.id)
  returning id into ws_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (ws_id, new.id, 'owner');

  update public.profiles set active_workspace_id = ws_id where id = new.id;

  insert into public.user_preferences (workspace_id, user_id, payload)
  values (ws_id, new.id, '{"theme":"system","tempUnit":"C","growPhase":"vegetative","currentSpaceId":"","mapViewMode":"2d"}'::jsonb);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
