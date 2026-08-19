-- Platform admin (super-admin) — manage all users & workspaces
-- Run after 001 + 002

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.platform_admins pa
    where pa.user_id = auth.uid()
  );
$$;

grant execute on function public.is_platform_admin() to authenticated;

-- RLS: self-check + full list for platform admins
drop policy if exists pa_select on public.platform_admins;
create policy pa_select on public.platform_admins
  for select
  using (user_id = auth.uid() or public.is_platform_admin());

-- One-time bootstrap when table is empty (run after first user registers)
create or replace function public.bootstrap_platform_admin_by_email(target_email text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  found_id uuid;
begin
  if exists (select 1 from public.platform_admins limit 1) then
    raise exception 'Platform admin bootstrap already completed';
  end if;
  if target_email is null or trim(target_email) = '' then
    return false;
  end if;
  select p.id into found_id
  from public.profiles p
  where lower(trim(p.email)) = lower(trim(target_email))
  limit 1;
  if found_id is null then
    return false;
  end if;
  insert into public.platform_admins (user_id) values (found_id)
  on conflict (user_id) do nothing;
  return true;
end;
$$;

grant execute on function public.bootstrap_platform_admin_by_email(text) to authenticated;

create or replace function public.admin_platform_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Forbidden';
  end if;
  return jsonb_build_object(
    'userCount', (select count(*)::int from public.profiles),
    'workspaceCount', (select count(*)::int from public.workspaces),
    'platformAdminCount', (select count(*)::int from public.platform_admins)
  );
end;
$$;

grant execute on function public.admin_platform_stats() to authenticated;

create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  display_name text,
  created_at timestamptz,
  workspace_count bigint
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
    coalesce(wc.cnt, 0)::bigint as workspace_count
  from public.profiles p
  left join (
    select wm.user_id, count(*)::bigint as cnt
    from public.workspace_members wm
    group by wm.user_id
  ) wc on wc.user_id = p.id
  order by p.created_at desc;
end;
$$;

grant execute on function public.admin_list_users() to authenticated;

create or replace function public.admin_list_workspaces()
returns table (
  id uuid,
  name text,
  owner_id uuid,
  owner_email text,
  owner_name text,
  member_count bigint,
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
    w.id,
    w.name,
    w.owner_id,
    op.email as owner_email,
    op.display_name as owner_name,
    coalesce(mc.cnt, 0)::bigint as member_count,
    w.created_at
  from public.workspaces w
  left join public.profiles op on op.id = w.owner_id
  left join (
    select wm.workspace_id, count(*)::bigint as cnt
    from public.workspace_members wm
    group by wm.workspace_id
  ) mc on mc.workspace_id = w.id
  order by w.created_at desc;
end;
$$;

grant execute on function public.admin_list_workspaces() to authenticated;

create or replace function public.admin_list_platform_admins()
returns table (
  user_id uuid,
  email text,
  display_name text,
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
    pa.user_id,
    p.email,
    p.display_name,
    pa.created_at
  from public.platform_admins pa
  join public.profiles p on p.id = pa.user_id
  order by pa.created_at asc;
end;
$$;

grant execute on function public.admin_list_platform_admins() to authenticated;

create or replace function public.admin_set_platform_admin(target_user_id uuid, grant_admin boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
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
  return true;
end;
$$;

grant execute on function public.admin_set_platform_admin(uuid, boolean) to authenticated;
