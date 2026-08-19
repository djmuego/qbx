-- Admin V5: workspace ops, member management, audit filters, KB categories, AI overview
-- Run after 011

-- Rename workspace
create or replace function public.admin_rename_workspace(p_ws_id uuid, p_name text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  ws_name text;
  clean_name text;
begin
  if not public.is_platform_admin() then
    raise exception 'Forbidden';
  end if;
  clean_name := trim(p_name);
  if clean_name = '' then
    raise exception 'Name required';
  end if;
  select name into ws_name from public.workspaces where id = p_ws_id;
  if ws_name is null then
    return false;
  end if;
  update public.workspaces set name = clean_name, updated_at = now() where id = p_ws_id;
  perform public.admin_write_audit('workspace.rename', 'workspace', p_ws_id::text, jsonb_build_object('from', ws_name, 'to', clean_name));
  return true;
end;
$$;

grant execute on function public.admin_rename_workspace(uuid, text) to authenticated;

-- Set member role (not owner — use transfer for that)
create or replace function public.admin_set_workspace_member_role(
  p_ws_id uuid,
  p_user_id uuid,
  p_role text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  ws_owner uuid;
begin
  if not public.is_platform_admin() then
    raise exception 'Forbidden';
  end if;
  if p_role not in ('admin', 'operator', 'viewer') then
    raise exception 'Invalid role';
  end if;
  select owner_id into ws_owner from public.workspaces where id = p_ws_id;
  if ws_owner is null then
    return false;
  end if;
  if p_user_id = ws_owner then
    raise exception 'Cannot change owner role — use transfer owner';
  end if;
  if not exists (select 1 from public.workspace_members where workspace_id = p_ws_id and user_id = p_user_id) then
    raise exception 'User is not a member';
  end if;
  update public.workspace_members set role = p_role where workspace_id = p_ws_id and user_id = p_user_id;
  perform public.admin_write_audit(
    'workspace.member_role',
    'workspace',
    p_ws_id::text,
    jsonb_build_object('userId', p_user_id, 'role', p_role)
  );
  return true;
end;
$$;

grant execute on function public.admin_set_workspace_member_role(uuid, uuid, text) to authenticated;

-- Remove member (not owner)
create or replace function public.admin_remove_workspace_member(p_ws_id uuid, p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  ws_owner uuid;
begin
  if not public.is_platform_admin() then
    raise exception 'Forbidden';
  end if;
  select owner_id into ws_owner from public.workspaces where id = p_ws_id;
  if ws_owner is null then
    return false;
  end if;
  if p_user_id = ws_owner then
    raise exception 'Cannot remove owner — transfer or delete workspace';
  end if;
  delete from public.workspace_members where workspace_id = p_ws_id and user_id = p_user_id;
  perform public.admin_write_audit(
    'workspace.member_remove',
    'workspace',
    p_ws_id::text,
    jsonb_build_object('userId', p_user_id)
  );
  return true;
end;
$$;

grant execute on function public.admin_remove_workspace_member(uuid, uuid) to authenticated;

-- Filtered audit log
create or replace function public.admin_list_audit_log_filtered(
  p_action text default null,
  p_target_type text default null,
  p_search text default null,
  p_offset int default 0,
  p_limit int default 50
)
returns table (
  id uuid,
  actor_id uuid,
  actor_email text,
  actor_name text,
  action text,
  target_type text,
  target_id text,
  meta jsonb,
  created_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  lim int;
  off int;
begin
  if not public.is_platform_admin() then
    raise exception 'Forbidden';
  end if;
  lim := greatest(1, least(coalesce(p_limit, 50), 200));
  off := greatest(coalesce(p_offset, 0), 0);

  return query
  with filtered as (
    select l.*
    from public.platform_audit_log l
    left join public.profiles ap on ap.id = l.actor_id
    where (p_action is null or p_action = '' or l.action = p_action)
      and (p_target_type is null or p_target_type = '' or l.target_type = p_target_type)
      and (
        p_search is null or p_search = ''
        or l.action ilike '%' || p_search || '%'
        or l.target_id ilike '%' || p_search || '%'
        or ap.email ilike '%' || p_search || '%'
        or ap.display_name ilike '%' || p_search || '%'
      )
  ),
  counted as (select count(*)::bigint as cnt from filtered)
  select
    f.id,
    f.actor_id,
    ap.email as actor_email,
    ap.display_name as actor_name,
    f.action,
    f.target_type,
    f.target_id,
    f.meta,
    f.created_at,
    c.cnt as total_count
  from filtered f
  left join public.profiles ap on ap.id = f.actor_id
  cross join counted c
  order by f.created_at desc
  limit lim offset off;
end;
$$;

grant execute on function public.admin_list_audit_log_filtered(text, text, text, int, int) to authenticated;

-- Knowledge category CRUD
create or replace function public.admin_upsert_knowledge_category(
  p_id uuid,
  p_slug text,
  p_title text,
  p_description text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  result_id uuid;
  clean_slug text;
begin
  if not public.is_platform_admin() then
    raise exception 'Forbidden';
  end if;
  clean_slug := lower(trim(regexp_replace(coalesce(p_slug, ''), '[^a-z0-9\-]+', '-', 'g'), '-'));
  if clean_slug = '' or trim(p_title) = '' then
    raise exception 'Slug and title required';
  end if;
  if p_id is null then
    insert into public.knowledge_categories (slug, title, description)
    values (clean_slug, trim(p_title), nullif(trim(p_description), ''))
    on conflict (slug) do update set title = excluded.title, description = excluded.description
    returning id into result_id;
  else
    update public.knowledge_categories
    set slug = clean_slug, title = trim(p_title), description = nullif(trim(p_description), '')
    where id = p_id
    returning id into result_id;
  end if;
  perform public.admin_write_audit('knowledge.category_upsert', 'knowledge_category', result_id::text, jsonb_build_object('slug', clean_slug));
  return result_id;
end;
$$;

grant execute on function public.admin_upsert_knowledge_category(uuid, text, text, text) to authenticated;

create or replace function public.admin_delete_knowledge_category(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  art_count int;
  cat_slug text;
begin
  if not public.is_platform_admin() then
    raise exception 'Forbidden';
  end if;
  select slug into cat_slug from public.knowledge_categories where id = p_id;
  if cat_slug is null then
    return false;
  end if;
  select count(*) into art_count from public.knowledge_articles where category_id = p_id;
  if art_count > 0 then
    raise exception 'Category has articles — reassign or delete them first';
  end if;
  delete from public.knowledge_categories where id = p_id;
  perform public.admin_write_audit('knowledge.category_delete', 'knowledge_category', p_id::text, jsonb_build_object('slug', cat_slug));
  return true;
end;
$$;

grant execute on function public.admin_delete_knowledge_category(uuid) to authenticated;

-- Knowledge stats for admin dashboard
create or replace function public.admin_knowledge_stats()
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
    'articleCount', (select count(*) from public.knowledge_articles),
    'publishedCount', (select count(*) from public.knowledge_articles where is_published),
    'chunkCount', (select count(*) from public.knowledge_embeddings),
    'categoryCount', (select count(*) from public.knowledge_categories),
    'lastArticleUpdate', (select max(updated_at) from public.knowledge_articles)
  ) into result;
  return coalesce(result, '{}'::jsonb);
end;
$$;

grant execute on function public.admin_knowledge_stats() to authenticated;

-- AI config overview for all farms
create or replace function public.admin_list_workspace_ai_overview()
returns table (
  workspace_id uuid,
  workspace_name text,
  owner_email text,
  managed_by_platform boolean,
  ai_enabled boolean,
  provider text,
  updated_at timestamptz
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
    p.email as owner_email,
    coalesce((c.payload->>'managedByPlatform')::boolean, false) as managed_by_platform,
    coalesce((c.payload->>'enabled')::boolean, false) as ai_enabled,
    coalesce(c.payload->>'provider', 'deepseek') as provider,
    c.updated_at
  from public.workspaces w
  left join public.profiles p on p.id = w.owner_id
  left join public.workspace_ai_config c on c.workspace_id = w.id
  order by w.name;
end;
$$;

grant execute on function public.admin_list_workspace_ai_overview() to authenticated;
