-- ============================================================
-- Alpha Comix — قاعدة البيانات الكاملة
-- شغّل هذا الملف كاملاً في Supabase SQL Editor
-- ============================================================

create extension if not exists pgcrypto;

-- ============ الأنواع ============
do $$ begin
  create type public.app_role as enum ('user','translator','team','admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum ('pending','paid','rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.join_status as enum ('pending','approved','rejected');
exception when duplicate_object then null; end $$;

-- ============ الجداول الأساسية ============
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  role public.app_role not null default 'user',
  points integer not null default 0 check(points >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  description text,
  support_wallet text,
  published boolean not null default true,
  owner_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.works (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null,
  kind text not null check(kind in ('comic','novel')),
  emoji text default '📖',
  cover_path text,
  cover_url text,
  grad_a text default '#1a237e',
  grad_b text default '#4a148c',
  genres text[] default '{}',
  age_rating text default '13+',
  status text default 'مستمرة',
  rating numeric(3,1) default 0,
  author text,
  synopsis text,
  published boolean not null default false,
  team_id uuid references public.teams(id),
  owner_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.works(id) on delete cascade,
  number integer not null,
  title text,
  kind text not null check(kind in ('comic','novel')),
  content text,
  pages text[] default '{}',
  is_locked boolean not null default false,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  unique(work_id, number)
);

create table if not exists public.chapter_purchases (
  user_id uuid not null references public.profiles(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  cost integer not null check(cost>0),
  purchased_at timestamptz not null default now(),
  primary key(user_id, chapter_id)
);

create table if not exists public.point_packs (
  id uuid primary key default gen_random_uuid(),
  points integer not null check(points>0),
  usdt_price numeric(12,2) not null check(usdt_price>0),
  bonus_text text,
  active boolean not null default true,
  sort_order integer not null default 0
);

create table if not exists public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  reference text unique not null default upper(substr(encode(gen_random_bytes(8),'hex'),1,12)),
  user_id uuid not null references public.profiles(id) on delete cascade,
  pack_id uuid not null references public.point_packs(id),
  tx_hash text,
  status public.payment_status not null default 'pending',
  admin_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.join_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  contact text not null,
  role text,
  langs text,
  bio text,
  status public.join_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.settings (
  key text primary key,
  value text not null
);

-- ============ الجداول المتقدمة ============
create table if not exists public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  work_id uuid not null references public.works(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, work_id)
);

create table if not exists public.reading_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  work_id uuid not null references public.works(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  page_number integer default 1,
  scroll_position float default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, work_id)
);

create table if not exists public.chapter_reads (
  user_id uuid not null references public.profiles(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, chapter_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  work_id uuid references public.works(id) on delete cascade,
  chapter_id uuid references public.chapters(id) on delete cascade,
  content text not null,
  parent_id uuid references public.comments(id) on delete cascade,
  likes integer default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.ratings (
  user_id uuid not null references public.profiles(id) on delete cascade,
  work_id uuid not null references public.works(id) on delete cascade,
  score integer not null check (score >= 1 AND score <= 5),
  created_at timestamptz not null default now(),
  primary key (user_id, work_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  work_id uuid references public.works(id) on delete cascade,
  chapter_id uuid references public.chapters(id) on delete cascade,
  type text not null default 'new_chapter',
  message text,
  is_read boolean default false,
  created_at timestamptz not null default now()
);

create table if not exists public.comment_likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  comment_id uuid not null references public.comments(id) on delete cascade,
  primary key (user_id, comment_id)
);

create table if not exists public.reading_status (
  user_id uuid not null references public.profiles(id) on delete cascade,
  work_id uuid not null references public.works(id) on delete cascade,
  status text not null check (status IN ('reading', 'plan', 'completed', 'paused')),
  updated_at timestamptz not null default now(),
  primary key (user_id, work_id)
);

create table if not exists public.reader_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  reading_mode text not null default 'webtoon' check (reading_mode IN ('webtoon', 'page')),
  font_size integer not null default 18 check (font_size BETWEEN 12 AND 32),
  line_height numeric not null default 2.2 check (line_height BETWEEN 1.2 AND 3.5),
  bg_color text not null default 'default',
  brightness integer not null default 100 check (brightness BETWEEN 30 AND 150),
  reading_direction text not null default 'rtl' check (reading_direction IN ('rtl', 'ltr')),
  updated_at timestamptz not null default now()
);

-- ============ البيانات الافتراضية ============
insert into public.point_packs(points,usdt_price,bonus_text,sort_order) values
(50,1,'',1),(275,5,'+10% هدية',2),(600,10,'+20% هدية',3)
on conflict do nothing;

insert into public.settings(key,value) values('site_wallet','ضع عنوان USDT TRC20 هنا')
on conflict(key) do nothing;

-- ============ المشغّل: إنشاء بروفايل تلقائياً ============
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,username)
  values(new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1)));
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ============ الدوال المساعدة ============
create or replace function public.is_admin()
returns boolean language sql security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and role='admin');
$$;
grant execute on function public.is_admin() to anon,authenticated;

create or replace function public.get_my_balance()
returns json language sql security definer set search_path=public as $$
  select json_build_object('balance', coalesce(points,0)) from public.profiles where id=auth.uid();
$$;
grant execute on function public.get_my_balance() to authenticated;

create or replace function public.get_work_chapters(p_work_id uuid)
returns json language sql security definer set search_path=public as $$
  select coalesce(json_agg(json_build_object(
    'id',c.id,'number',c.number,'title',c.title,'kind',c.kind,'is_locked',c.is_locked
  ) order by c.number desc),'[]'::json)
  from public.chapters c
  where c.work_id=p_work_id and c.published=true;
$$;
grant execute on function public.get_work_chapters(uuid) to anon,authenticated;

create or replace function public.can_read_chapter(p_chapter_id uuid)
returns json language plpgsql security definer set search_path=public as $$
declare c record; allowed boolean:=false;
begin
  select * into c from public.chapters where id=p_chapter_id and published=true;
  if not found then return json_build_object('allowed',false); end if;
  if not c.is_locked then allowed:=true;
  elsif auth.uid() is not null then
    select exists(select 1 from public.chapter_purchases where user_id=auth.uid() and chapter_id=p_chapter_id) into allowed;
  end if;
  return json_build_object('allowed',allowed);
end; $$;
grant execute on function public.can_read_chapter(uuid) to anon,authenticated;

create or replace function public.unlock_chapter(p_chapter_id uuid)
returns json language plpgsql security definer set search_path=public as $$
declare c record; bal int;
begin
  if auth.uid() is null then raise exception 'يجب تسجيل الدخول'; end if;
  select * into c from public.chapters where id=p_chapter_id and published=true for update;
  if not found then raise exception 'الفصل غير موجود'; end if;
  if not c.is_locked then return json_build_object('ok',true,'already_free',true); end if;
  if exists(select 1 from public.chapter_purchases where user_id=auth.uid() and chapter_id=p_chapter_id) then
    return json_build_object('ok',true,'already_owned',true);
  end if;
  select points into bal from public.profiles where id=auth.uid() for update;
  if bal < 10 then raise exception 'رصيد النقاط غير كاف'; end if;
  update public.profiles set points=points-10 where id=auth.uid();
  insert into public.chapter_purchases(user_id,chapter_id,cost) values(auth.uid(),p_chapter_id,10);
  return json_build_object('ok',true,'balance',bal-10);
end; $$;
grant execute on function public.unlock_chapter(uuid) to authenticated;

create or replace function public.create_payment_request(p_pack_id uuid)
returns json language plpgsql security definer set search_path=public as $$
declare r public.payment_requests;
begin
  if auth.uid() is null then raise exception 'يجب تسجيل الدخول'; end if;
  insert into public.payment_requests(user_id,pack_id) values(auth.uid(),p_pack_id) returning * into r;
  return json_build_object('reference',r.reference,'id',r.id);
end; $$;
grant execute on function public.create_payment_request(uuid) to authenticated;

create or replace function public.admin_review_payment(p_id uuid, p_status public.payment_status, p_note text default null)
returns json language plpgsql security definer set search_path=public as $$
declare r record; pts int;
begin
  if not public.is_admin() then raise exception 'غير مصرح'; end if;
  select pr.*,pp.points into r
  from public.payment_requests pr
  join public.point_packs pp on pp.id=pr.pack_id
  where pr.id=p_id for update;
  if not found then raise exception 'الطلب غير موجود'; end if;
  if r.status='paid' then return json_build_object('ok',true,'already_paid',true); end if;
  update public.payment_requests set status=p_status, admin_note=p_note, reviewed_at=now() where id=p_id;
  if p_status='paid' then update public.profiles set points=points+r.points where id=r.user_id; end if;
  return json_build_object('ok',true);
end; $$;
grant execute on function public.admin_review_payment(uuid,public.payment_status,text) to authenticated;

create or replace function public.get_chapter_for_reader(p_chapter_id uuid)
returns json language plpgsql security definer set search_path=public as $$
declare c record; allowed boolean;
begin
  select * into c from public.chapters where id=p_chapter_id and published=true;
  if not found then raise exception 'الفصل غير موجود'; end if;
  select (can_read_chapter(p_chapter_id)->>'allowed')::boolean into allowed;
  if not allowed then raise exception 'الفصل مقفل'; end if;
  return json_build_object(
    'id',c.id,'work_id',c.work_id,'number',c.number,'title',c.title,
    'kind',c.kind,'content',c.content,'pages',c.pages,
    'work_title',(select title from public.works where id=c.work_id)
  );
end; $$;
grant execute on function public.get_chapter_for_reader(uuid) to anon,authenticated;

create or replace function public.get_my_progress(p_work_id uuid)
returns json language plpgsql security definer set search_path=public as $$
declare r record;
begin
  select * into r from public.reading_progress where user_id=auth.uid() and work_id=p_work_id;
  if not found then return json_build_object('has_progress', false); end if;
  return json_build_object(
    'has_progress', true, 'chapter_id', r.chapter_id,
    'page_number', r.page_number, 'updated_at', r.updated_at
  );
end; $$;
grant execute on function public.get_my_progress(uuid) to authenticated;

create or replace function public.save_progress(p_work_id uuid, p_chapter_id uuid, p_page integer default 1)
returns json language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then return json_build_object('ok', false); end if;
  insert into public.reading_progress (user_id, work_id, chapter_id, page_number, updated_at)
  values (auth.uid(), p_work_id, p_chapter_id, p_page, now())
  on conflict (user_id, work_id) do update
  set chapter_id=p_chapter_id, page_number=p_page, updated_at=now();
  return json_build_object('ok', true);
end; $$;
grant execute on function public.save_progress(uuid, uuid, integer) to authenticated;

create or replace function public.mark_chapter_read(p_chapter_id uuid)
returns json language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then return json_build_object('ok', false); end if;
  insert into public.chapter_reads (user_id, chapter_id)
  values (auth.uid(), p_chapter_id)
  on conflict (user_id, chapter_id) do nothing;
  return json_build_object('ok', true);
end; $$;
grant execute on function public.mark_chapter_read(uuid) to authenticated;

create or replace function public.get_read_chapters(p_work_id uuid)
returns json language plpgsql security definer set search_path=public as $$
declare result json;
begin
  if auth.uid() is null then return '[]'::json; end if;
  select json_agg(cr.chapter_id) into result
  from public.chapter_reads cr
  join public.chapters c on c.id=cr.chapter_id
  where cr.user_id=auth.uid() and c.work_id=p_work_id;
  return coalesce(result, '[]'::json);
end; $$;
grant execute on function public.get_read_chapters(uuid) to authenticated;

create or replace function public.get_work_rating(p_work_id uuid)
returns json language plpgsql security definer set search_path=public as $$
declare avg_score numeric; cnt integer; my_score integer;
begin
  select AVG(score), COUNT(*) into avg_score, cnt from public.ratings where work_id=p_work_id;
  select score into my_score from public.ratings where work_id=p_work_id and user_id=auth.uid();
  return json_build_object(
    'average', coalesce(round(avg_score,1),0),
    'count', cnt,
    'my_score', my_score
  );
end; $$;
grant execute on function public.get_work_rating(uuid) to anon,authenticated;

create or replace function public.get_work_comments(p_work_id uuid)
returns json language plpgsql security definer set search_path=public as $$
declare result json;
begin
  select json_agg(json_build_object(
    'id',c.id,'content',c.content,'created_at',c.created_at,
    'username',p.username,'likes',c.likes,
    'is_liked',(cl.user_id is not null)
  ) order by c.created_at desc) into result
  from public.comments c
  join public.profiles p on p.id=c.user_id
  left join public.comment_likes cl on cl.comment_id=c.id and cl.user_id=auth.uid()
  where c.work_id=p_work_id and c.parent_id is null;
  return coalesce(result, '[]'::json);
end; $$;
grant execute on function public.get_work_comments(uuid) to anon,authenticated;

create or replace function public.get_reading_status(p_work_id uuid)
returns text language sql security definer set search_path=public as $$
  select status from public.reading_status where user_id=auth.uid() and work_id=p_work_id;
$$;
grant execute on function public.get_reading_status(uuid) to authenticated;

create or replace function public.get_library_stats()
returns json language plpgsql security definer set search_path=public as $$
declare result json;
begin
  select json_build_object(
    'reading', (select count(*) from public.reading_status where user_id=auth.uid() and status='reading'),
    'plan', (select count(*) from public.reading_status where user_id=auth.uid() and status='plan'),
    'completed', (select count(*) from public.reading_status where user_id=auth.uid() and status='completed'),
    'paused', (select count(*) from public.reading_status where user_id=auth.uid() and status='paused'),
    'favorites', (select count(*) from public.favorites where user_id=auth.uid()),
    'read_chapters', (select count(*) from public.chapter_reads where user_id=auth.uid())
  ) into result;
  return result;
end; $$;
grant execute on function public.get_library_stats() to authenticated;

-- ============ RLS ============
alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.works enable row level security;
alter table public.chapters enable row level security;
alter table public.chapter_purchases enable row level security;
alter table public.point_packs enable row level security;
alter table public.payment_requests enable row level security;
alter table public.join_requests enable row level security;
alter table public.settings enable row level security;
alter table public.favorites enable row level security;
alter table public.reading_progress enable row level security;
alter table public.chapter_reads enable row level security;
alter table public.comments enable row level security;
alter table public.ratings enable row level security;
alter table public.notifications enable row level security;
alter table public.comment_likes enable row level security;
alter table public.reading_status enable row level security;
alter table public.reader_settings enable row level security;

drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles for select using(auth.uid()=id or public.is_admin());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated using(auth.uid() = id) with check(auth.uid() = id);

drop policy if exists teams_public on public.teams;
create policy teams_public on public.teams for select using(published=true or owner_id=auth.uid() or public.is_admin());

drop policy if exists works_public on public.works;
create policy works_public on public.works for select using(published=true or owner_id=auth.uid() or public.is_admin());

drop policy if exists chapters_public on public.chapters;
create policy chapters_public on public.chapters for select using(
  (published=true and (not is_locked or exists(select 1 from public.chapter_purchases cp where cp.user_id=auth.uid() and cp.chapter_id=id)))
  or exists(select 1 from public.works w where w.id=work_id and (w.owner_id=auth.uid() or public.is_admin()))
);

drop policy if exists purchases_self on public.chapter_purchases;
create policy purchases_self on public.chapter_purchases for select using(user_id=auth.uid());

drop policy if exists packs_public on public.point_packs;
create policy packs_public on public.point_packs for select using(active=true or public.is_admin());

drop policy if exists packs_admin_all on public.point_packs;
create policy packs_admin_all on public.point_packs for all to authenticated using(public.is_admin());

drop policy if exists payments_self on public.payment_requests;
create policy payments_self on public.payment_requests for select using(user_id=auth.uid() or public.is_admin());

drop policy if exists joins_self on public.join_requests;
create policy joins_self on public.join_requests for select using(user_id=auth.uid() or public.is_admin());

drop policy if exists joins_insert on public.join_requests;
create policy joins_insert on public.join_requests for insert with check(user_id=auth.uid());

drop policy if exists settings_public on public.settings;
create policy settings_public on public.settings for select using(key='site_wallet');

drop policy if exists settings_admin_all on public.settings;
create policy settings_admin_all on public.settings for all to authenticated using(public.is_admin());

drop policy if exists favorites_self on public.favorites;
create policy favorites_self on public.favorites for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

drop policy if exists progress_self on public.reading_progress;
create policy progress_self on public.reading_progress for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

drop policy if exists chapter_reads_self on public.chapter_reads;
create policy chapter_reads_self on public.chapter_reads for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

drop policy if exists comments_read on public.comments;
create policy comments_read on public.comments for select using(true);

drop policy if exists comments_write on public.comments;
create policy comments_write on public.comments for insert to authenticated with check(user_id=auth.uid());

drop policy if exists comments_delete on public.comments;
create policy comments_delete on public.comments for delete to authenticated using(user_id=auth.uid() or public.is_admin());

drop policy if exists ratings_read on public.ratings;
create policy ratings_read on public.ratings for select using(true);

drop policy if exists ratings_write on public.ratings;
create policy ratings_write on public.ratings for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

drop policy if exists notifications_self on public.notifications;
create policy notifications_self on public.notifications for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

drop policy if exists comment_likes_read on public.comment_likes;
create policy comment_likes_read on public.comment_likes for select using(true);

drop policy if exists comment_likes_write on public.comment_likes;
create policy comment_likes_write on public.comment_likes for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

drop policy if exists reading_status_self on public.reading_status;
create policy reading_status_self on public.reading_status for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

drop policy if exists reader_settings_self on public.reader_settings;
create policy reader_settings_self on public.reader_settings for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

-- ============ سياسات الإدارة للأعمال والفصول ============
drop policy if exists works_admin_insert on public.works;
create policy works_admin_insert on public.works for insert to authenticated with check(public.is_admin());

drop policy if exists works_admin_update on public.works;
create policy works_admin_update on public.works for update to authenticated using(public.is_admin());

drop policy if exists works_admin_delete on public.works;
create policy works_admin_delete on public.works for delete to authenticated using(public.is_admin());

drop policy if exists chapters_admin_insert on public.chapters;
create policy chapters_admin_insert on public.chapters for insert to authenticated with check(public.is_admin());

drop policy if exists chapters_admin_update on public.chapters;
create policy chapters_admin_update on public.chapters for update to authenticated using(public.is_admin());

drop policy if exists chapters_admin_delete on public.chapters;
create policy chapters_admin_delete on public.chapters for delete to authenticated using(public.is_admin());

drop policy if exists teams_admin_insert on public.teams;
create policy teams_admin_insert on public.teams for insert to authenticated with check(public.is_admin());

drop policy if exists teams_admin_update on public.teams;
create policy teams_admin_update on public.teams for update to authenticated using(public.is_admin());

-- ============ Storage ============
insert into storage.buckets(id,name,public) values('chapters','chapters',false)
on conflict(id) do update set public=false;

drop policy if exists chapter_storage_read on storage.objects;
create policy chapter_storage_read on storage.objects for select using (bucket_id='chapters' and (
  exists(select 1 from public.chapters c where c.published=true and c.pages @> array[name]::text[]
    and (not c.is_locked or exists(select 1 from public.chapter_purchases cp where cp.user_id=auth.uid() and cp.chapter_id=c.id)))
  or public.is_admin()
));

drop policy if exists chapter_storage_admin_insert on storage.objects;
create policy chapter_storage_admin_insert on storage.objects for insert to authenticated with check(bucket_id='chapters' and public.is_admin());

drop policy if exists chapter_storage_admin_update on storage.objects;
create policy chapter_storage_admin_update on storage.objects for update to authenticated using(bucket_id='chapters' and public.is_admin());

drop policy if exists chapter_storage_admin_delete on storage.objects;
create policy chapter_storage_admin_delete on storage.objects for delete to authenticated using(bucket_id='chapters' and public.is_admin());

-- ============ الصلاحيات ============
grant usage on schema public to anon,authenticated;
grant select on public.teams,public.works,public.chapters,public.point_packs,public.settings to anon,authenticated;
grant select on public.profiles,public.chapter_purchases,public.payment_requests,public.join_requests to authenticated;
grant insert on public.join_requests to authenticated;
grant select,insert,update,delete on public.favorites to authenticated;
grant select,insert,update,delete on public.reading_progress to authenticated;
grant select,insert,delete on public.chapter_reads to authenticated;
grant select on public.comments to anon,authenticated;
grant insert,delete on public.comments to authenticated;
grant select on public.ratings to anon,authenticated;
grant insert,update on public.ratings to authenticated;
grant select,update on public.notifications to authenticated;
grant select,insert,delete on public.comment_likes to authenticated;
grant select,insert,update,delete on public.reading_status to authenticated;
grant select,insert,update,delete on public.reader_settings to authenticated;

-- ============ تحويل أول مستخدم إلى مشرف ============
-- بعد إنشاء حسابك، نفّذ هذا السطر مع استبدال الإيميل:
-- update public.profiles set role='admin' where username = 'اسم_المستخدم';