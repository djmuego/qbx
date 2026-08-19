-- Admin V3 + GDPR account deletion / data export
-- Run after 005

-- Extend user list with auth ban flag
create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  display_name text,
  created_at timestamptz,
  workspace_count bigint,
  is_disabled boolean,
  is_auth_banned boolean
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
    p.is_disabled,
    coalesce(
      (au.banned_until is not null and au.banned_until > now()),
      false
    ) as is_auth_banned
  from public.profiles p
  left join auth.users au on au.id = p.id
  left join (
    select wm.user_id, count(*)::bigint as cnt
    from public.workspace_members wm
    group by wm.user_id
  ) wc on wc.user_id = p.id
  order by p.created_at desc;
end;
$$;

create or replace function public.admin_ban_user(target_user_id uuid, ban boolean)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_email text;
begin
  if not public.is_platform_admin() then
    raise exception 'Forbidden';
  end if;
  if target_user_id is null or target_user_id = auth.uid() then
    raise exception 'Cannot change your own account';
  end if;
  if exists (select 1 from public.platform_admins pa where pa.user_id = target_user_id) then
    raise exception 'Revoke platform admin before banning';
  end if;
  if not exists (select 1 from public.profiles where id = target_user_id) then
    return false;
  end if;

  update public.profiles
  set is_disabled = ban, updated_at = now()
  where id = target_user_id;

  update auth.users
  set
    banned_until = case when ban then 'infinity'::timestamptz else null end,
    updated_at = now()
  where id = target_user_id;

  select email into target_email from public.profiles where id = target_user_id;

  perform public.admin_write_audit(
    case when ban then 'user.auth_ban' else 'user.auth_unban' end,
    'user',
    target_user_id::text,
    jsonb_build_object('email', target_email)
  );

  return true;
end;
$$;

grant execute on function public.admin_ban_user(uuid, boolean) to authenticated;

create or replace function public.admin_delete_workspace(ws_id uuid)
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
  if ws_id is null then
    return false;
  end if;
  select name into ws_name from public.workspaces where id = ws_id;
  if ws_name is null then
    return false;
  end if;

  delete from public.workspaces where id = ws_id;

  perform public.admin_write_audit(
    'workspace.delete',
    'workspace',
    ws_id::text,
    jsonb_build_object('name', ws_name)
  );

  return true;
end;
$$;

grant execute on function public.admin_delete_workspace(uuid) to authenticated;

create or replace function public.admin_get_workspace_payload(ws_id uuid)
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

  select jsonb_build_object(
    'workspaceId', w.id,
    'name', w.name,
    'ownerId', w.owner_id,
    'createdAt', w.created_at,
    'spaces', coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'payload', s.payload) order by s.id)
      from public.spaces s where s.workspace_id = w.id
    ), '[]'::jsonb),
    'devices', coalesce((
      select jsonb_agg(jsonb_build_object('id', d.id, 'spaceId', d.space_id, 'payload', d.payload) order by d.id)
      from public.devices d where d.workspace_id = w.id
    ), '[]'::jsonb),
    'automations', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'spaceId', a.space_id, 'payload', a.payload) order by a.id)
      from public.automations a where a.workspace_id = w.id
    ), '[]'::jsonb),
    'spatialMaps', coalesce((
      select jsonb_agg(jsonb_build_object('spaceId', m.space_id, 'payload', m.payload) order by m.space_id)
      from public.spatial_maps m where m.workspace_id = w.id
    ), '[]'::jsonb),
    'plants', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'spaceId', p.space_id, 'payload', p.payload) order by p.id)
      from public.plants p where p.workspace_id = w.id
    ), '[]'::jsonb),
    'subscription', (
      select jsonb_build_object(
        'tier', sub.tier,
        'status', sub.status,
        'trialEndsAt', sub.trial_ends_at
      )
      from public.subscriptions sub where sub.workspace_id = w.id
    )
  )
  into result
  from public.workspaces w
  where w.id = ws_id;

  return result;
end;
$$;

grant execute on function public.admin_get_workspace_payload(uuid) to authenticated;

create or replace function public.admin_export_audit_log()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  payload jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'Forbidden';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', l.id,
        'actorId', l.actor_id,
        'actorEmail', ap.email,
        'action', l.action,
        'targetType', l.target_type,
        'targetId', l.target_id,
        'meta', l.meta,
        'createdAt', l.created_at
      )
      order by l.created_at desc
    ),
    '[]'::jsonb
  )
  into payload
  from public.platform_audit_log l
  left join public.profiles ap on ap.id = l.actor_id;

  perform public.admin_write_audit('audit.export', 'audit', null, jsonb_build_object('rows', jsonb_array_length(payload)));

  return payload;
end;
$$;

grant execute on function public.admin_export_audit_log() to authenticated;

-- GDPR: user exports own data (read-only JSON)
create or replace function public.export_my_data()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  result jsonb;
begin
  if uid is null then
    raise exception 'Unauthorized';
  end if;

  select jsonb_build_object(
    'exportedAt', now(),
    'profile', (
      select jsonb_build_object(
        'id', p.id,
        'email', p.email,
        'displayName', p.display_name,
        'locale', p.locale,
        'createdAt', p.created_at
      )
      from public.profiles p where p.id = uid
    ),
    'memberships', coalesce((
      select jsonb_agg(jsonb_build_object(
        'workspaceId', wm.workspace_id,
        'role', wm.role,
        'workspaceName', w.name
      ))
      from public.workspace_members wm
      join public.workspaces w on w.id = wm.workspace_id
      where wm.user_id = uid
    ), '[]'::jsonb),
    'ownedWorkspaces', coalesce((
      select jsonb_agg(jsonb_build_object('id', w.id, 'name', w.name, 'createdAt', w.created_at))
      from public.workspaces w where w.owner_id = uid
    ), '[]'::jsonb)
  )
  into result;

  return result;
end;
$$;

grant execute on function public.export_my_data() to authenticated;

-- GDPR: permanent account deletion (user-initiated)
create or replace function public.delete_my_account(confirm_email text)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
  profile_email text;
  owned_ws record;
begin
  if uid is null then
    raise exception 'Unauthorized';
  end if;

  select lower(trim(email)) into profile_email
  from public.profiles where id = uid;

  if profile_email is null or lower(trim(confirm_email)) <> profile_email then
    raise exception 'Email confirmation does not match';
  end if;

  if exists (select 1 from public.platform_admins where user_id = uid) then
    raise exception 'Transfer platform admin role before deleting account';
  end if;

  -- Delete workspaces owned by user (cascade removes all farm data)
  for owned_ws in select id, name from public.workspaces where owner_id = uid loop
    delete from public.workspaces where id = owned_ws.id;
  end loop;

  delete from public.workspace_members where user_id = uid;
  delete from public.profiles where id = uid;
  delete from auth.users where id = uid;

  return true;
end;
$$;

grant execute on function public.delete_my_account(text) to authenticated;
