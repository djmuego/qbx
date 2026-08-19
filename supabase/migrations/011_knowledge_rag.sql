-- Knowledge Base + pgvector RAG for AI Agronomist
-- Run after 010

create extension if not exists vector with schema extensions;

-- Categories
create table if not exists public.knowledge_categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  created_at timestamptz not null default now()
);

-- Articles (Markdown)
create table if not exists public.knowledge_articles (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.knowledge_categories (id) on delete set null,
  title text not null,
  slug text unique not null,
  content_markdown text not null default '',
  tags text[] not null default '{}',
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists knowledge_articles_category_idx on public.knowledge_articles (category_id);
create index if not exists knowledge_articles_published_idx on public.knowledge_articles (is_published);

-- Vector chunks (1536 = OpenAI text-embedding-3-small)
create table if not exists public.knowledge_embeddings (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.knowledge_articles (id) on delete cascade,
  chunk_content text not null,
  embedding extensions.vector(1536),
  chunk_index int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists knowledge_embeddings_article_idx on public.knowledge_embeddings (article_id);

create index if not exists knowledge_embeddings_hnsw_idx
  on public.knowledge_embeddings
  using hnsw (embedding extensions.vector_cosine_ops);

alter table public.knowledge_categories enable row level security;
alter table public.knowledge_articles enable row level security;
alter table public.knowledge_embeddings enable row level security;

drop policy if exists knowledge_categories_select on public.knowledge_categories;
create policy knowledge_categories_select on public.knowledge_categories
  for select to authenticated using (true);

drop policy if exists knowledge_articles_select on public.knowledge_articles;
create policy knowledge_articles_select on public.knowledge_articles
  for select to authenticated using (is_published = true);

drop policy if exists knowledge_embeddings_select on public.knowledge_embeddings;
create policy knowledge_embeddings_select on public.knowledge_embeddings
  for select to authenticated using (
    exists (
      select 1 from public.knowledge_articles a
      where a.id = article_id and a.is_published = true
    )
  );

insert into public.knowledge_categories (slug, title, description) values
  ('climate', 'Климат', 'VPD, температура, влажность, вентиляция'),
  ('nutrition', 'Питание', 'NPK, EC, pH, дефициты элементов'),
  ('lighting', 'Освещение', 'DLI, PPFD, фотопериод'),
  ('defects', 'Дефекты', 'Симптомы стресса, болезни, вредители'),
  ('cultivars', 'Сорта', 'Профили культур и сортов'),
  ('hydroponics', 'Гидропоника', 'NFT, DWC, субстраты, полив')
on conflict (slug) do nothing;

create or replace function public.match_knowledge_chunks(
  query_embedding extensions.vector(1536),
  match_count int default 6,
  match_threshold float default 0.45
)
returns table (
  id uuid,
  article_id uuid,
  article_title text,
  article_slug text,
  chunk_content text,
  similarity float
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    e.id,
    e.article_id,
    a.title as article_title,
    a.slug as article_slug,
    e.chunk_content,
    1 - (e.embedding <=> query_embedding) as similarity
  from public.knowledge_embeddings e
  join public.knowledge_articles a on a.id = e.article_id
  where a.is_published = true
    and e.embedding is not null
    and 1 - (e.embedding <=> query_embedding) >= match_threshold
  order by e.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

grant execute on function public.match_knowledge_chunks(extensions.vector(1536), int, float) to authenticated;

create or replace function public.admin_list_knowledge_categories()
returns setof public.knowledge_categories
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Forbidden';
  end if;
  return query select * from public.knowledge_categories order by title;
end;
$$;

grant execute on function public.admin_list_knowledge_categories() to authenticated;

create or replace function public.admin_list_knowledge_articles()
returns table (
  id uuid,
  category_id uuid,
  category_slug text,
  category_title text,
  title text,
  slug text,
  tags text[],
  is_published boolean,
  chunk_count bigint,
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
    a.id,
    a.category_id,
    c.slug as category_slug,
    c.title as category_title,
    a.title,
    a.slug,
    a.tags,
    a.is_published,
    coalesce((select count(*) from public.knowledge_embeddings e where e.article_id = a.id), 0) as chunk_count,
    a.updated_at
  from public.knowledge_articles a
  left join public.knowledge_categories c on c.id = a.category_id
  order by a.updated_at desc;
end;
$$;

grant execute on function public.admin_list_knowledge_articles() to authenticated;

create or replace function public.admin_get_knowledge_article(p_article_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  row public.knowledge_articles%rowtype;
  cat public.knowledge_categories%rowtype;
  chunks bigint;
begin
  if not public.is_platform_admin() then
    raise exception 'Forbidden';
  end if;
  select * into row from public.knowledge_articles where id = p_article_id;
  if not found then
    return null;
  end if;
  if row.category_id is not null then
    select * into cat from public.knowledge_categories where id = row.category_id;
  end if;
  select count(*) into chunks from public.knowledge_embeddings where article_id = row.id;
  return jsonb_build_object(
    'id', row.id,
    'categoryId', row.category_id,
    'categorySlug', cat.slug,
    'categoryTitle', cat.title,
    'title', row.title,
    'slug', row.slug,
    'contentMarkdown', row.content_markdown,
    'tags', row.tags,
    'isPublished', row.is_published,
    'chunkCount', chunks,
    'createdAt', row.created_at,
    'updatedAt', row.updated_at
  );
end;
$$;

grant execute on function public.admin_get_knowledge_article(uuid) to authenticated;

create or replace function public.admin_upsert_knowledge_article(
  p_article_id uuid,
  p_category_id uuid,
  p_title text,
  p_slug text,
  p_content_markdown text,
  p_tags text[],
  p_is_published boolean
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
  if clean_slug = '' then
    raise exception 'Invalid slug';
  end if;

  if p_article_id is null then
    insert into public.knowledge_articles (category_id, title, slug, content_markdown, tags, is_published, updated_at)
    values (p_category_id, trim(p_title), clean_slug, coalesce(p_content_markdown, ''), coalesce(p_tags, '{}'), coalesce(p_is_published, true), now())
    returning id into result_id;
  else
    update public.knowledge_articles
    set
      category_id = p_category_id,
      title = trim(p_title),
      slug = clean_slug,
      content_markdown = coalesce(p_content_markdown, ''),
      tags = coalesce(p_tags, '{}'),
      is_published = coalesce(p_is_published, true),
      updated_at = now()
    where id = p_article_id
    returning id into result_id;
    if result_id is null then
      raise exception 'Article not found';
    end if;
  end if;

  perform public.admin_write_audit(
    'knowledge.article_upsert',
    'knowledge_article',
    result_id::text,
    jsonb_build_object('slug', clean_slug, 'title', trim(p_title))
  );

  return result_id;
end;
$$;

grant execute on function public.admin_upsert_knowledge_article(uuid, uuid, text, text, text, text[], boolean) to authenticated;

create or replace function public.admin_delete_knowledge_article(p_article_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  slug text;
begin
  if not public.is_platform_admin() then
    raise exception 'Forbidden';
  end if;
  select a.slug into slug from public.knowledge_articles a where a.id = p_article_id;
  if slug is null then
    return false;
  end if;
  delete from public.knowledge_articles where id = p_article_id;
  perform public.admin_write_audit('knowledge.article_delete', 'knowledge_article', p_article_id::text, jsonb_build_object('slug', slug));
  return true;
end;
$$;

grant execute on function public.admin_delete_knowledge_article(uuid) to authenticated;

create or replace function public.admin_replace_knowledge_embeddings(
  p_article_id uuid,
  p_chunks jsonb
)
returns int
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  item jsonb;
  inserted int := 0;
  idx int := 0;
  emb extensions.vector(1536);
begin
  if not public.is_platform_admin() then
    raise exception 'Forbidden';
  end if;
  if not exists (select 1 from public.knowledge_articles where id = p_article_id) then
    raise exception 'Article not found';
  end if;

  delete from public.knowledge_embeddings where article_id = p_article_id;

  for item in select * from jsonb_array_elements(coalesce(p_chunks, '[]'::jsonb))
  loop
    emb := (item->>'embedding')::extensions.vector(1536);
    insert into public.knowledge_embeddings (article_id, chunk_content, embedding, chunk_index)
    values (
      p_article_id,
      coalesce(item->>'content', ''),
      emb,
      coalesce((item->>'chunkIndex')::int, idx)
    );
    inserted := inserted + 1;
    idx := idx + 1;
  end loop;

  update public.knowledge_articles set updated_at = now() where id = p_article_id;

  perform public.admin_write_audit(
    'knowledge.embeddings_reindex',
    'knowledge_article',
    p_article_id::text,
    jsonb_build_object('chunkCount', inserted)
  );

  return inserted;
end;
$$;

grant execute on function public.admin_replace_knowledge_embeddings(uuid, jsonb) to authenticated;
