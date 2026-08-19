-- Admin V4: expanded platform powers (subscriptions, user lifecycle, integrations, ownership)
-- Run after 008

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
    'platformAdminCount', (select count(*)::int from public.platform_admins),
    'proWorkspaceCount', (
      select count(*)::int from public.subscriptions
      where tier in ('pro', 'enterprise') or hub_lifetime = true
    ),
    'trialingCount', (
      select count(*)::int from public.subscriptions where status = 'trialing'
    ),
    'disabledUserCount', (
      select count(*)::int from public.profiles where is_disabled = true
    )
  );
end;
$$;

create or replace function public.admin_list_subscriptions()
returns table (
  workspace_id uuid,
  workspace_name text,
  owner_email text,
  tier public.subscription_tier,
  status public.subscription_status,
  trial_ends_at timestamptz,
  hub_lifetime boolean,
  stripe_customer_id text
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
    w.id as workspace_id,
    w.name as workspace_name,
    op.email as owner_email,
    coalesce(s.tier, 'free'::public.subscription_tier) as tier,
    coalesce(s.status, 'trialing'::public.subscription_status) as status,
    s.trial_ends_at,
    coalesce(s.hub_lifetime, false) as hub_lifetime,
    s.stripe_customer_id
  from public.workspaces w
  left join public.subscriptions s on s.workspace_id = w.id
  left join public.profiles op on op.id = w.owner_id
  order by w.created_at desc;
end;
$$;

grant execute on function public.admin_list_subscriptions() to authenticated;

create or replace function public.admin_set_subscription(
  ws_id uuid,
  p_tier text default null,
  p_status text default null,
  p_trial_ends_at timestamptz default null,
  p_extend_trial_days int default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  ws_name text;
  new_tier public.subscription_tier;
  new_status public.subscription_status;
  new_trial timestamptz;
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

  insert into public.subscriptions (workspace_id, tier, status, trial_ends_at)
  values (ws_id, 'free', 'trialing', now() + interval '14 days')
  on conflict (workspace_id) do nothing;

  if p_tier is not null then
    new_tier := p_tier::public.subscription_tier;
    update public.subscriptions set tier = new_tier, updated_at = now() where workspace_id = ws_id;
  end if;

  if p_status is not null then
    new_status := p_status::public.subscription_status;
    update public.subscriptions set status = new_status, updated_at = now() where workspace_id = ws_id;
  end if;

  if p_trial_ends_at is not null then
    update public.subscriptions set trial_ends_at = p_trial_ends_at, updated_at = now() where workspace_id = ws_id;
  elsif p_extend_trial_days is not null and p_extend_trial_days > 0 then
    select coalesce(trial_ends_at, now()) into new_trial from public.subscriptions where workspace_id = ws_id;
    update public.subscriptions
    set trial_ends_at = new_trial + (p_extend_trial_days || ' days')::interval,
        updated_at = now()
    where workspace_id = ws_id;
  end if;

  perform public.admin_write_audit(
    'subscription.admin_update',
    'workspace',
    ws_id::text,
    jsonb_build_object(
      'name', ws_name,
      'tier', p_tier,
      'status', p_status,
      'extendTrialDays', p_extend_trial_days
    )
  );

  return true;
end;
$$;

grant execute on function public.admin_set_subscription(uuid, text, text, timestamptz, int) to authenticated;

create or replace function public.admin_get_user_detail(target_user_id uuid)
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
  if target_user_id is null then
    return null;
  end if;

  select jsonb_build_object(
    'id', p.id,
    'email', p.email,
    'displayName', p.display_name,
    'locale', p.locale,
    'createdAt', p.created_at,
    'isDisabled', p.is_disabled,
    'isAuthBanned', coalesce(au.banned_until is not null and au.banned_until > now(), false),
    'isPlatformAdmin', exists (select 1 from public.platform_admins pa where pa.user_id = p.id),
    'memberships', coalesce((
      select jsonb_agg(jsonb_build_object(
        'workspaceId', wm.workspace_id,
        'workspaceName', w.name,
        'role', wm.role,
        'joinedAt', wm.created_at
      ) order by w.name)
      from public.workspace_members wm
      join public.workspaces w on w.id = wm.workspace_id
      where wm.user_id = p.id
    ), '[]'::jsonb),
    'ownedWorkspaces', coalesce((
      select jsonb_agg(jsonb_build_object('id', w.id, 'name', w.name, 'createdAt', w.created_at) order by w.name)
      from public.workspaces w where w.owner_id = p.id
    ), '[]'::jsonb)
  )
  into result
  from public.profiles p
  left join auth.users au on au.id = p.id
  where p.id = target_user_id;

  return result;
end;
$$;

grant execute on function public.admin_get_user_detail(uuid) to authenticated;

create or replace function public.admin_export_user_data(target_user_id uuid)
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
  if target_user_id is null then
    raise exception 'User not found';
  end if;

  select jsonb_build_object(
    'exportedAt', now(),
    'exportedBy', auth.uid(),
    'profile', (
      select jsonb_build_object(
        'id', p.id,
        'email', p.email,
        'displayName', p.display_name,
        'locale', p.locale,
        'createdAt', p.created_at,
        'isDisabled', p.is_disabled
      )
      from public.profiles p where p.id = target_user_id
    ),
    'memberships', coalesce((
      select jsonb_agg(jsonb_build_object(
        'workspaceId', wm.workspace_id,
        'role', wm.role,
        'workspaceName', w.name
      ))
      from public.workspace_members wm
      join public.workspaces w on w.id = wm.workspace_id
      where wm.user_id = target_user_id
    ), '[]'::jsonb),
    'ownedWorkspaces', coalesce((
      select jsonb_agg(jsonb_build_object('id', w.id, 'name', w.name, 'createdAt', w.created_at))
      from public.workspaces w where w.owner_id = target_user_id
    ), '[]'::jsonb)
  )
  into result;

  perform public.admin_write_audit(
    'user.data_export',
    'user',
    target_user_id::text,
    jsonb_build_object('email', (result->'profile'->>'email'))
  );

  return result;
end;
$$;

grant execute on function public.admin_export_user_data(uuid) to authenticated;

create or replace function public.admin_delete_user(target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_email text;
  owned_ws record;
begin
  if not public.is_platform_admin() then
    raise exception 'Forbidden';
  end if;
  if target_user_id is null or target_user_id = auth.uid() then
    raise exception 'Cannot delete your own account';
  end if;
  if exists (select 1 from public.platform_admins where user_id = target_user_id) then
    raise exception 'Revoke platform admin before deleting user';
  end if;
  if not exists (select 1 from public.profiles where id = target_user_id) then
    return false;
  end if;

  select email into target_email from public.profiles where id = target_user_id;

  for owned_ws in select id, name from public.workspaces where owner_id = target_user_id loop
    delete from public.workspaces where id = owned_ws.id;
  end loop;

  delete from public.workspace_members where user_id = target_user_id;
  delete from public.profiles where id = target_user_id;
  delete from auth.users where id = target_user_id;

  perform public.admin_write_audit(
    'user.delete',
    'user',
    target_user_id::text,
    jsonb_build_object('email', target_email)
  );

  return true;
end;
$$;

grant execute on function public.admin_delete_user(uuid) to authenticated;

create or replace function public.admin_transfer_workspace_owner(ws_id uuid, new_owner_id uuid)
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
  if ws_id is null or new_owner_id is null then
    return false;
  end if;

  select name into ws_name from public.workspaces where id = ws_id;
  if ws_name is null then
    return false;
  end if;
  if not exists (select 1 from public.profiles where id = new_owner_id) then
    raise exception 'Target user not found';
  end if;

  update public.workspaces set owner_id = new_owner_id, updated_at = now() where id = ws_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (ws_id, new_owner_id, 'owner')
  on conflict (workspace_id, user_id) do update set role = 'owner';

  perform public.admin_write_audit(
    'workspace.transfer_owner',
    'workspace',
    ws_id::text,
    jsonb_build_object('name', ws_name, 'newOwnerId', new_owner_id)
  );

  return true;
end;
$$;

grant execute on function public.admin_transfer_workspace_owner(uuid, uuid) to authenticated;

create or replace function public.admin_get_workspace_integrations(ws_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  row public.workspace_integrations%rowtype;
begin
  if not public.is_platform_admin() then
    raise exception 'Forbidden';
  end if;
  select * into row from public.workspace_integrations where workspace_id = ws_id;
  if not found then
    return jsonb_build_object('workspaceId', ws_id, 'payload', '{}'::jsonb, 'updatedAt', null);
  end if;
  return jsonb_build_object(
    'workspaceId', row.workspace_id,
    'payload', row.payload,
    'updatedAt', row.updated_at
  );
end;
$$;

grant execute on function public.admin_get_workspace_integrations(uuid) to authenticated;

create or replace function public.admin_get_workspace_subscription(ws_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  row public.subscriptions%rowtype;
begin
  if not public.is_platform_admin() then
    raise exception 'Forbidden';
  end if;
  select * into row from public.subscriptions where workspace_id = ws_id;
  if not found then
    return jsonb_build_object(
      'hubLifetime', false,
      'tier', 'free',
      'status', 'trialing',
      'trialEndsAt', null,
      'stripeCustomerId', null
    );
  end if;
  return jsonb_build_object(
    'hubLifetime', row.hub_lifetime,
    'tier', row.tier,
    'status', row.status,
    'trialEndsAt', row.trial_ends_at,
    'stripeCustomerId', row.stripe_customer_id
  );
end;
$$;

grant execute on function public.admin_get_workspace_subscription(uuid) to authenticated;
