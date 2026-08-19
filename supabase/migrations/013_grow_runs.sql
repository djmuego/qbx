-- GrowRun cycles + telemetry snapshots (per space)
-- Run after 012

create table if not exists public.grow_runs (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  space_id text not null,
  runs jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, space_id)
);

create table if not exists public.grow_run_telemetry (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  space_id text not null,
  grow_run_id text not null,
  samples jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, space_id, grow_run_id)
);

alter table public.grow_runs enable row level security;
alter table public.grow_run_telemetry enable row level security;

drop policy if exists grow_runs_select on public.grow_runs;
create policy grow_runs_select on public.grow_runs
  for select using (public.is_workspace_member(workspace_id));

drop policy if exists grow_runs_write on public.grow_runs;
create policy grow_runs_write on public.grow_runs
  for all
  using (public.workspace_role(workspace_id) in ('owner', 'operator', 'admin'))
  with check (public.workspace_role(workspace_id) in ('owner', 'operator', 'admin'));

drop policy if exists grow_run_telemetry_select on public.grow_run_telemetry;
create policy grow_run_telemetry_select on public.grow_run_telemetry
  for select using (public.is_workspace_member(workspace_id));

drop policy if exists grow_run_telemetry_write on public.grow_run_telemetry;
create policy grow_run_telemetry_write on public.grow_run_telemetry
  for all
  using (public.workspace_role(workspace_id) in ('owner', 'operator', 'admin'))
  with check (public.workspace_role(workspace_id) in ('owner', 'operator', 'admin'));
