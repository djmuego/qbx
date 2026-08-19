-- Workspace-level hub integration config (non-secret fields; tokens stay local until connector ships)
-- Run after 007

create table if not exists public.workspace_integrations (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.workspace_integrations enable row level security;

drop policy if exists workspace_integrations_select on public.workspace_integrations;
create policy workspace_integrations_select on public.workspace_integrations
  for select using (public.is_workspace_member(workspace_id));

drop policy if exists workspace_integrations_write on public.workspace_integrations;
create policy workspace_integrations_write on public.workspace_integrations
  for all
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_integrations.workspace_id
        and wm.user_id = auth.uid()
        and wm.role in ('owner', 'admin', 'operator')
    )
  )
  with check (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_integrations.workspace_id
        and wm.user_id = auth.uid()
        and wm.role in ('owner', 'admin', 'operator')
    )
  );
