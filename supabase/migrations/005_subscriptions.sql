-- QBX Commercial Layer — workspace subscriptions (Stripe + entitlements SSOT)
-- Run after 004

do $$ begin
  create type public.subscription_tier as enum ('free', 'pro', 'enterprise');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.subscription_status as enum (
    'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade unique,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  tier public.subscription_tier not null default 'free',
  status public.subscription_status not null default 'trialing',
  trial_ends_at timestamptz default (now() + interval '14 days'),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  hub_lifetime boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_subscriptions_workspace on public.subscriptions (workspace_id);
create index if not exists idx_subscriptions_stripe_customer on public.subscriptions (stripe_customer_id)
  where stripe_customer_id is not null;

alter table public.subscriptions enable row level security;

drop policy if exists subscriptions_select_member on public.subscriptions;
create policy subscriptions_select_member on public.subscriptions
  for select
  using (public.is_workspace_member(workspace_id));

-- Stripe webhooks use service_role — no insert/update policy for members

create or replace function public.ensure_workspace_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.subscriptions (workspace_id, tier, status, trial_ends_at)
  values (new.id, 'free', 'trialing', now() + interval '14 days')
  on conflict (workspace_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_workspace_subscription on public.workspaces;
create trigger on_workspace_subscription
  after insert on public.workspaces
  for each row execute function public.ensure_workspace_subscription();

-- Backfill existing workspaces
insert into public.subscriptions (workspace_id, tier, status, trial_ends_at)
select w.id, 'free', 'trialing', now() + interval '14 days'
from public.workspaces w
where not exists (
  select 1 from public.subscriptions s where s.workspace_id = w.id
);

create or replace function public.get_workspace_subscription(ws_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  row public.subscriptions%rowtype;
begin
  if not public.is_workspace_member(ws_id) then
    raise exception 'Forbidden';
  end if;
  select * into row from public.subscriptions where workspace_id = ws_id;
  if not found then
    return jsonb_build_object(
      'workspaceId', ws_id,
      'tier', 'free',
      'status', 'trialing',
      'trialEndsAt', (now() + interval '14 days')
    );
  end if;
  return jsonb_build_object(
    'workspaceId', row.workspace_id,
    'tier', row.tier,
    'status', row.status,
    'trialEndsAt', row.trial_ends_at,
    'currentPeriodStart', row.current_period_start,
    'currentPeriodEnd', row.current_period_end,
    'cancelAtPeriodEnd', row.cancel_at_period_end,
    'stripeCustomerId', row.stripe_customer_id,
    'hubLifetime', row.hub_lifetime
  );
end;
$$;

grant execute on function public.get_workspace_subscription(uuid) to authenticated;
