-- Profile email for member invites + coworker profile visibility

alter table public.profiles add column if not exists email text;

-- Backfill emails from auth.users (migration runner has access)
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and (p.email is null or p.email = '');

create unique index if not exists profiles_email_lower_idx
  on public.profiles (lower(trim(email)))
  where email is not null and trim(email) <> '';

-- Keep profile email in sync with auth.users
create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set email = new.email, updated_at = now()
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_sync on auth.users;
create trigger on_auth_user_email_sync
  after insert or update of email on auth.users
  for each row execute function public.sync_profile_email();

-- Invite lookup: authenticated users can resolve email → user id
create or replace function public.lookup_user_id_by_email(target_email text)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  found_id uuid;
begin
  if auth.uid() is null or target_email is null or trim(target_email) = '' then
    return null;
  end if;
  select id into found_id
  from public.profiles
  where lower(trim(email)) = lower(trim(target_email))
  limit 1;
  return found_id;
end;
$$;

grant execute on function public.lookup_user_id_by_email(text) to authenticated;

-- Coworkers in same workspace can read each other's profile (name + email for member list)
create policy profiles_select_coworkers on public.profiles
  for select
  using (
    exists (
      select 1
      from public.workspace_members wm_self
      join public.workspace_members wm_other
        on wm_self.workspace_id = wm_other.workspace_id
      where wm_self.user_id = auth.uid()
        and wm_other.user_id = profiles.id
    )
  );

-- Bootstrap: store email on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ws_id uuid;
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.email
  );

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
