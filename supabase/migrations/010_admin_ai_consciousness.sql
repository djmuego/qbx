-- Admin: workspace AI agent config + platform consciousness (global prompts)
-- Run after 009

create table if not exists public.workspace_ai_config (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.workspace_ai_config enable row level security;

drop policy if exists workspace_ai_config_select on public.workspace_ai_config;
create policy workspace_ai_config_select on public.workspace_ai_config
  for select using (public.is_workspace_member(workspace_id));

create table if not exists public.platform_config (
  config_key text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.platform_config enable row level security;

drop policy if exists platform_config_select on public.platform_config;
create policy platform_config_select on public.platform_config
  for select to authenticated using (true);

-- Members: read workspace AI config
create or replace function public.get_workspace_ai_config(ws_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  row public.workspace_ai_config%rowtype;
begin
  if not public.is_workspace_member(ws_id) then
    raise exception 'Forbidden';
  end if;
  select * into row from public.workspace_ai_config where workspace_id = ws_id;
  if not found then
    return '{}'::jsonb;
  end if;
  return row.payload;
end;
$$;

grant execute on function public.get_workspace_ai_config(uuid) to authenticated;

-- All authenticated users: read platform consciousness
create or replace function public.get_platform_consciousness()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  row public.platform_config%rowtype;
begin
  select * into row from public.platform_config where config_key = 'consciousness';
  if not found then
    return '{}'::jsonb;
  end if;
  return row.payload;
end;
$$;

grant execute on function public.get_platform_consciousness() to authenticated;

create or replace function public.admin_get_workspace_ai_config(ws_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  row public.workspace_ai_config%rowtype;
begin
  if not public.is_platform_admin() then
    raise exception 'Forbidden';
  end if;
  select * into row from public.workspace_ai_config where workspace_id = ws_id;
  if not found then
    return '{}'::jsonb;
  end if;
  return row.payload;
end;
$$;

grant execute on function public.admin_get_workspace_ai_config(uuid) to authenticated;

create or replace function public.admin_set_workspace_ai_config(ws_id uuid, config_payload jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  ws_name text;
begin
  if not public.is_platform_admin() then
    raise exception 'Forbidden';
  end if;
  select name into ws_name from public.workspaces where id = ws_id;
  if ws_name is null then
    return false;
  end if;

  insert into public.workspace_ai_config (workspace_id, payload, updated_at)
  values (ws_id, coalesce(config_payload, '{}'::jsonb), now())
  on conflict (workspace_id) do update
  set payload = excluded.payload, updated_at = now();

  perform public.admin_write_audit(
    'workspace.ai_config_update',
    'workspace',
    ws_id::text,
    jsonb_build_object('name', ws_name, 'managed', config_payload->'managedByPlatform')
  );

  return true;
end;
$$;

grant execute on function public.admin_set_workspace_ai_config(uuid, jsonb) to authenticated;

create or replace function public.admin_get_platform_consciousness()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  row public.platform_config%rowtype;
begin
  if not public.is_platform_admin() then
    raise exception 'Forbidden';
  end if;
  select * into row from public.platform_config where config_key = 'consciousness';
  if not found then
    return '{}'::jsonb;
  end if;
  return row.payload;
end;
$$;

grant execute on function public.admin_get_platform_consciousness() to authenticated;

create or replace function public.admin_set_platform_consciousness(config_payload jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Forbidden';
  end if;

  insert into public.platform_config (config_key, payload, updated_at)
  values ('consciousness', coalesce(config_payload, '{}'::jsonb), now())
  on conflict (config_key) do update
  set payload = excluded.payload, updated_at = now();

  perform public.admin_write_audit(
    'platform.consciousness_update',
    'platform',
    'consciousness',
    jsonb_build_object('keys', (select array_agg(key) from jsonb_object_keys(config_payload) as key))
  );

  return true;
end;
$$;

grant execute on function public.admin_set_platform_consciousness(jsonb) to authenticated;
