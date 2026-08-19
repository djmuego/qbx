-- Admin V2: user disable, audit log, workspace detail
-- Run after 003

alter table public.profiles add column if not exists is_disabled boolean not null default false;

create table if not exists public.platform_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_platform_audit_log_created on public.platform_audit_log (created_at desc);

alter table public.platform_audit_log enable row level security;

drop policy if exists platform_audit_log_select on public.platform_audit_log;
create policy platform_audit_log_select on public.platform_audit_log
  for select
  using (public.is_platform_admin());

create or replace function public.admin_write_audit(
  p_action text,
  p_target_type text,
  p_target_id text default null,
  p_meta jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.platform_audit_log (actor_id, action, target_type, target_id, meta)
  values (auth.uid(), p_action, p_target_type, p_target_id, coalesce(p_meta, '{}'::jsonb));
end;
$$;

create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  display_name text,
  created_at timestamptz,
  workspace_count bigint,
  is_disabled boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Forbidden';
  end if;
  return query
  select
    p.id,
    p.email,
    p.display_name,
    p.created_at,
    coalesce(wc.cnt, 0)::bigint as workspace_count,
    p.is_disabled
  from public.profiles p
  left join (
    select wm.user_id, count(*)::bigint as cnt
    from public.workspace_members wm
    group by wm.user_id
  ) wc on wc.user_id = p.id
  order by p.created_at desc;
end;
$$;

create or replace function public.admin_set_user_disabled(target_user_id uuid, disabled_flag boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_email text;
begin
  if not public.is_platform_admin() then
    raise exception 'Forbidden';
  end if;
  if target_user_id is null then
    return false;
  end if;
  if target_user_id = auth.uid() then
    raise exception 'Cannot change your own account status';
  end if;
  if exists (
    select 1 from public.platform_admins pa where pa.user_id = target_user_id
  ) then
    raise exception 'Revoke platform admin before disabling this user';
  end if;
  if not exists (select 1 from public.profiles where id = target_user_id) then
    return false;
  end if;

  update public.profiles
  set is_disabled = disabled_flag, updated_at = now()
  where id = target_user_id;

  select email into target_email from public.profiles where id = target_user_id;

  perform public.admin_write_audit(
    case when disabled_flag then 'user.disable' else 'user.enable' end,
    'user',
    target_user_id::text,
    jsonb_build_object('email', target_email)
  );

  return true;
end;
$$;

grant execute on function public.admin_set_user_disabled(uuid, boolean) to authenticated;

create or replace function public.admin_get_workspace_detail(ws_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'Forbidden';
  end if;
  if ws_id is null then
    return null;
  end if;

  select jsonb_build_object(
    'id', w.id,
    'name', w.name,
    'ownerId', w.owner_id,
    'ownerEmail', op.email,
    'ownerName', op.display_name,
    'createdAt', w.created_at,
    'memberCount', coalesce(mc.cnt, 0),
    'members', coalesce(members.json, '[]'::jsonb),
    'counts', jsonb_build_object(
      'spaces', (select count(*)::int from public.spaces s where s.workspace_id = w.id),
      'devices', (select count(*)::int from public.devices d where d.workspace_id = w.id),
      'automations', (select count(*)::int from public.automations a where a.workspace_id = w.id),
      'spatialMaps', (select count(*)::int from public.spatial_maps m where m.workspace_id = w.id),
      'plants', (select count(*)::int from public.plants p where p.workspace_id = w.id)
    )
  )
  into result
  from public.workspaces w
  left join public.profiles op on op.id = w.owner_id
  left join (
    select wm.workspace_id, count(*)::bigint as cnt
    from public.workspace_members wm
    group by wm.workspace_id
  ) mc on mc.workspace_id = w.id
  left join lateral (
    select jsonb_agg(
      jsonb_build_object(
        'userId', wm.user_id,
        'email', p.email,
        'displayName', p.display_name,
        'role', wm.role,
        'joinedAt', wm.created_at
      )
      order by wm.created_at
    ) as json
    from public.workspace_members wm
    join public.profiles p on p.id = wm.user_id
    where wm.workspace_id = w.id
  ) members on true
  where w.id = ws_id;

  return result;
end;
$$;

grant execute on function public.admin_get_workspace_detail(uuid) to authenticated;

create or replace function public.admin_list_audit_log(p_limit int default 100)
returns table (
  id uuid,
  actor_id uuid,
  actor_email text,
  actor_name text,
  action text,
  target_type text,
  target_id text,
  meta jsonb,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Forbidden';
  end if;
  return query
  select
    l.id,
    l.actor_id,
    ap.email as actor_email,
    ap.display_name as actor_name,
    l.action,
    l.target_type,
    l.target_id,
    l.meta,
    l.created_at
  from public.platform_audit_log l
  left join public.profiles ap on ap.id = l.actor_id
  order by l.created_at desc
  limit greatest(1, least(coalesce(p_limit, 100), 500));
end;
$$;

grant execute on function public.admin_list_audit_log(int) to authenticated;

create or replace function public.admin_set_platform_admin(target_user_id uuid, grant_admin boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_email text;
begin
  if not public.is_platform_admin() then
    raise exception 'Forbidden';
  end if;
  if target_user_id is null then
    return false;
  end if;
  if not exists (select 1 from public.profiles where id = target_user_id) then
    return false;
  end if;
  if grant_admin then
    insert into public.platform_admins (user_id) values (target_user_id)
    on conflict (user_id) do nothing;
  else
    if target_user_id = auth.uid() then
      raise exception 'Cannot revoke your own platform admin';
    end if;
    delete from public.platform_admins where user_id = target_user_id;
  end if;

  select email into target_email from public.profiles where id = target_user_id;

  perform public.admin_write_audit(
    case when grant_admin then 'platform_admin.grant' else 'platform_admin.revoke' end,
    'user',
    target_user_id::text,
    jsonb_build_object('email', target_email)
  );

  return true;
end;
$$;
