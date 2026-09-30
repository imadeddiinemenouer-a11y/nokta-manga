-- نُقطة مانجا: قاعدة بيانات وإجراءات آمنة
create extension if not exists pgcrypto;

create type public.app_role as enum ('user','translator','team','admin');
create type public.payment_status as enum ('pending','paid','rejected');
create type public.join_status as enum ('pending','approved','rejected');

create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 username text unique,
 role public.app_role not null default 'user',
 points integer not null default 0 check(points >= 0),
 created_at timestamptz not null default now()
);

create table if not exists public.teams (
 id uuid primary key default gen_random_uuid(), name text not null, role text, description text,
 support_wallet text, published boolean not null default true, owner_id uuid references public.profiles(id), created_at timestamptz not null default now()
);
create table if not exists public.works (
 id uuid primary key default gen_random_uuid(), title text not null, type text not null, kind text not null check(kind in ('comic','novel')),
 emoji text default '📖', cover_path text, cover_url text, grad_a text default '#1a237e', grad_b text default '#4a148c',
 genres text[] default '{}', age_rating text default '13+', status text default 'مستمرة', rating numeric(3,1) default 0,
 author text, synopsis text, published boolean not null default false, team_id uuid references public.teams(id), owner_id uuid references public.profiles(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.chapters (
 id uuid primary key default gen_random_uuid(), work_id uuid not null references public.works(id) on delete cascade, number integer not null,
 title text, kind text not null check(kind in ('comic','novel')), content text, pages text[] default '{}', is_locked boolean not null default false,
 published boolean not null default false, created_at timestamptz not null default now(), unique(work_id,number)
);
create table if not exists public.chapter_purchases (
 user_id uuid not null references public.profiles(id) on delete cascade, chapter_id uuid not null references public.chapters(id) on delete cascade,
 cost integer not null check(cost>0), purchased_at timestamptz not null default now(), primary key(user_id,chapter_id)
);
create table if not exists public.point_packs (
 id uuid primary key default gen_random_uuid(), points integer not null check(points>0), usdt_price numeric(12,2) not null check(usdt_price>0), bonus_text text,
 active boolean not null default true, sort_order integer not null default 0
);
create table if not exists public.payment_requests (
 id uuid primary key default gen_random_uuid(), reference text unique not null default upper(substr(encode(gen_random_bytes(8),'hex'),1,12)),
 user_id uuid not null references public.profiles(id) on delete cascade, pack_id uuid not null references public.point_packs(id), tx_hash text,
 status public.payment_status not null default 'pending', admin_note text, created_at timestamptz not null default now(), reviewed_at timestamptz
);
create table if not exists public.join_requests (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 name text not null, contact text not null, role text, langs text, bio text, status public.join_status not null default 'pending', created_at timestamptz not null default now()
);
create table if not exists public.settings (key text primary key, value text not null);

insert into public.point_packs(points,usdt_price,bonus_text,sort_order) values
(50,1,'',1),(275,5,'+10% هدية',2),(600,10,'+20% هدية',3) on conflict do nothing;
insert into public.settings(key,value) values('site_wallet','ضع عنوان USDT TRC20 هنا') on conflict(key) do nothing;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.profiles(id,username) values(new.id,coalesce(new.raw_user_meta_data->>'username',split_part(new.email,'@',1))); return new; end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.get_my_balance() returns json language sql security definer set search_path=public as $$
select json_build_object('balance',coalesce(points,0)) from public.profiles where id=auth.uid(); $$;


create or replace function public.get_work_chapters(p_work_id uuid) returns json language sql security definer set search_path=public as $$
select coalesce(json_agg(json_build_object('id',c.id,'number',c.number,'title',c.title,'kind',c.kind,'is_locked',c.is_locked) order by c.number desc),'[]'::json)
from public.chapters c where c.work_id=p_work_id and c.published=true; $$;
grant execute on function public.get_work_chapters(uuid) to anon,authenticated;

create or replace function public.can_read_chapter(p_chapter_id uuid) returns json language plpgsql security definer set search_path=public as $$
declare c record; allowed boolean:=false;
begin select * into c from public.chapters where id=p_chapter_id and published=true;
 if not found then return json_build_object('allowed',false); end if;
 if not c.is_locked then allowed:=true; elsif auth.uid() is not null then select exists(select 1 from public.chapter_purchases where user_id=auth.uid() and chapter_id=p_chapter_id) into allowed; end if;
 return json_build_object('allowed',allowed); end; $$;

create or replace function public.unlock_chapter(p_chapter_id uuid) returns json language plpgsql security definer set search_path=public as $$
declare c record; bal int;
begin
 if auth.uid() is null then raise exception 'يجب تسجيل الدخول'; end if;
 select * into c from public.chapters where id=p_chapter_id and published=true for update;
 if not found then raise exception 'الفصل غير موجود'; end if;
 if not c.is_locked then return json_build_object('ok',true,'already_free',true); end if;
 if exists(select 1 from public.chapter_purchases where user_id=auth.uid() and chapter_id=p_chapter_id) then return json_build_object('ok',true,'already_owned',true); end if;
 select points into bal from public.profiles where id=auth.uid() for update;
 if bal < 10 then raise exception 'رصيد النقاط غير كاف'; end if;
 update public.profiles set points=points-10 where id=auth.uid();
 insert into public.chapter_purchases(user_id,chapter_id,cost) values(auth.uid(),p_chapter_id,10);
 return json_build_object('ok',true,'balance',bal-10); end; $$;

create or replace function public.create_payment_request(p_pack_id uuid) returns json language plpgsql security definer set search_path=public as $$
declare r public.payment_requests;
begin if auth.uid() is null then raise exception 'يجب تسجيل الدخول'; end if;
 insert into public.payment_requests(user_id,pack_id) values(auth.uid(),p_pack_id) returning * into r;
 return json_build_object('reference',r.reference,'id',r.id); end; $$;


create or replace function public.admin_review_payment(p_id uuid,p_status public.payment_status,p_note text default null) returns json language plpgsql security definer set search_path=public as $$
declare r record; pts int;
begin if not public.is_admin() then raise exception 'غير مصرح'; end if;
 select pr.*,pp.points into r from public.payment_requests pr join public.point_packs pp on pp.id=pr.pack_id where pr.id=p_id for update;
 if not found then raise exception 'الطلب غير موجود'; end if;
 if r.status='paid' then return json_build_object('ok',true,'already_paid',true); end if;
 update public.payment_requests set status=p_status,admin_note=p_note,reviewed_at=now() where id=p_id;
 if p_status='paid' then update public.profiles set points=points+r.points where id=r.user_id; end if;
 return json_build_object('ok',true); end; $$;

grant execute on function public.admin_review_payment(uuid,public.payment_status,text) to authenticated;

create or replace function public.get_chapter_for_reader(p_chapter_id uuid) returns json language plpgsql security definer set search_path=public as $$
declare c record; allowed boolean;
begin
 select * into c from public.chapters where id=p_chapter_id and published=true; if not found then raise exception 'الفصل غير موجود'; end if;
 select (can_read_chapter(p_chapter_id)->>'allowed')::boolean into allowed; if not allowed then raise exception 'الفصل مقفل'; end if;
 return json_build_object('id',c.id,'work_id',c.work_id,'number',c.number,'title',c.title,'kind',c.kind,'content',c.content,'pages',c.pages,
 'work_title',(select title from public.works where id=c.work_id)); end; $$;

create or replace function public.is_admin() returns boolean language sql security definer set search_path=public as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='admin'); $$;
grant execute on function public.is_admin() to anon,authenticated;

alter table public.profiles enable row level security; alter table public.teams enable row level security; alter table public.works enable row level security; alter table public.chapters enable row level security;
alter table public.chapter_purchases enable row level security; alter table public.point_packs enable row level security; alter table public.payment_requests enable row level security; alter table public.join_requests enable row level security; alter table public.settings enable row level security;

drop policy if exists profiles_self on public.profiles; create policy profiles_self on public.profiles for select using(auth.uid()=id or public.is_admin());
drop policy if exists teams_public on public.teams; create policy teams_public on public.teams for select using(published=true or owner_id=auth.uid() or public.is_admin());
drop policy if exists works_public on public.works; create policy works_public on public.works for select using(published=true or owner_id=auth.uid() or public.is_admin());
drop policy if exists chapters_public on public.chapters; create policy chapters_public on public.chapters for select using((published=true and (not is_locked or exists(select 1 from public.chapter_purchases cp where cp.user_id=auth.uid() and cp.chapter_id=id))) or exists(select 1 from works w where w.id=work_id and (w.owner_id=auth.uid() or public.is_admin())));
drop policy if exists purchases_self on public.chapter_purchases; create policy purchases_self on public.chapter_purchases for select using(user_id=auth.uid());
drop policy if exists packs_public on public.point_packs; create policy packs_public on public.point_packs for select using(active=true or public.is_admin());
drop policy if exists payments_self on public.payment_requests; create policy payments_self on public.payment_requests for select using(user_id=auth.uid() or public.is_admin());
drop policy if exists joins_self on public.join_requests; create policy joins_self on public.join_requests for select using(user_id=auth.uid() or public.is_admin()); create policy joins_insert on public.join_requests for insert with check(user_id=auth.uid());
drop policy if exists settings_public on public.settings; create policy settings_public on public.settings for select using(key='site_wallet');

insert into storage.buckets(id,name,public) values('chapters','chapters',false) on conflict(id) do update set public=false;

drop policy if exists chapter_storage_read on storage.objects;
create policy chapter_storage_read on storage.objects for select using (bucket_id='chapters' and (
  exists(select 1 from public.chapters c where c.published=true and c.pages @> array[name]::text[] and (not c.is_locked or exists(select 1 from public.chapter_purchases cp where cp.user_id=auth.uid() and cp.chapter_id=c.id)))
  or public.is_admin()
));
drop policy if exists chapter_storage_admin_insert on storage.objects;
create policy chapter_storage_admin_insert on storage.objects for insert to authenticated with check(bucket_id='chapters' and public.is_admin());
drop policy if exists chapter_storage_admin_update on storage.objects;
create policy chapter_storage_admin_update on storage.objects for update to authenticated using(bucket_id='chapters' and public.is_admin());
drop policy if exists chapter_storage_admin_delete on storage.objects;
create policy chapter_storage_admin_delete on storage.objects for delete to authenticated using(bucket_id='chapters' and public.is_admin());

drop policy if exists works_admin_insert on public.works; create policy works_admin_insert on public.works for insert to authenticated with check(public.is_admin());
drop policy if exists works_admin_update on public.works; create policy works_admin_update on public.works for update to authenticated using(public.is_admin());
drop policy if exists works_admin_delete on public.works; create policy works_admin_delete on public.works for delete to authenticated using(public.is_admin());
drop policy if exists chapters_admin_insert on public.chapters; create policy chapters_admin_insert on public.chapters for insert to authenticated with check(public.is_admin());
drop policy if exists chapters_admin_update on public.chapters; create policy chapters_admin_update on public.chapters for update to authenticated using(public.is_admin());
drop policy if exists chapters_admin_delete on public.chapters; create policy chapters_admin_delete on public.chapters for delete to authenticated using(public.is_admin());
drop policy if exists teams_admin_insert on public.teams; create policy teams_admin_insert on public.teams for insert to authenticated with check(public.is_admin());
drop policy if exists teams_admin_update on public.teams; create policy teams_admin_update on public.teams for update to authenticated using(public.is_admin());

grant usage on schema public to anon,authenticated; grant select on public.teams,public.works,public.chapters,public.point_packs,public.settings to anon,authenticated; grant select on public.profiles,public.chapter_purchases,public.payment_requests,public.join_requests to authenticated; grant insert on public.join_requests to authenticated; grant execute on function public.get_my_balance() to authenticated; grant execute on function public.can_read_chapter(uuid) to anon,authenticated; grant execute on function public.unlock_chapter(uuid) to authenticated; grant execute on function public.create_payment_request(uuid) to authenticated; grant execute on function public.get_chapter_for_reader(uuid) to anon,authenticated;

-- IMPORTANT: replace the first admin role manually after creating your account:
-- update public.profiles set role='admin' where id='YOUR-USER-UUID';
