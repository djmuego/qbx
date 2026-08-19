-- Commercial admin: hub lifetime grant + stripe customer helper
-- Run after 006

create or replace function public.admin_set_hub_lifetime(ws_id uuid, enabled boolean)
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

  insert into public.subscriptions (workspace_id, tier, status, hub_lifetime)
  values (ws_id, 'free', 'active', enabled)
  on conflict (workspace_id) do update
  set hub_lifetime = enabled, updated_at = now();

  perform public.admin_write_audit(
    case when enabled then 'subscription.hub_lifetime_grant' else 'subscription.hub_lifetime_revoke' end,
    'workspace',
    ws_id::text,
    jsonb_build_object('name', ws_name)
  );

  return true;
end;
$$;

grant execute on function public.admin_set_hub_lifetime(uuid, boolean) to authenticated;

-- Used by Stripe edge function (service_role) to attach customer id
create or replace function public.set_workspace_stripe_customer(ws_id uuid, customer_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if ws_id is null or customer_id is null or length(trim(customer_id)) = 0 then
    return false;
  end if;

  insert into public.subscriptions (workspace_id, tier, status, stripe_customer_id)
  values (ws_id, 'free', 'trialing', customer_id)
  on conflict (workspace_id) do update
  set stripe_customer_id = excluded.stripe_customer_id, updated_at = now();

  return true;
end;
$$;

revoke all on function public.set_workspace_stripe_customer(uuid, text) from public;
grant execute on function public.set_workspace_stripe_customer(uuid, text) to service_role;

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
    return jsonb_build_object('hubLifetime', false, 'tier', 'free', 'status', 'trialing');
  end if;
  return jsonb_build_object(
    'hubLifetime', row.hub_lifetime,
    'tier', row.tier,
    'status', row.status,
    'trialEndsAt', row.trial_ends_at
  );
end;
$$;

grant execute on function public.admin_get_workspace_subscription(uuid) to authenticated;
