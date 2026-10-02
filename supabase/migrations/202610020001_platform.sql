-- Apply once to the intended Supabase project. Existing Cloudflare data is
-- preserved in its original database; import it only with a verified UUID map.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  avatar_url text,
  role text not null default 'student' check (role in ('student','admin')),
  created bigint not null default (extract(epoch from now())*1000)::bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.rate_limits (key text primary key,count integer not null,expires bigint not null);
create table public.passages (id text primary key,title text not null,difficulty integer not null check(difficulty between 1 and 5),type text not null,content text not null,data text not null,status text not null default 'approved');
create index idx_passage_difficulty on public.passages(status,difficulty);
create table public.questions (id text primary key,subject text not null check(subject in ('ELA','Math')),skill text not null,difficulty integer not null check(difficulty between 1 and 5),passage_id text references public.passages(id),fingerprint text not null unique,data text not null,status text not null default 'approved',created bigint not null);
create index idx_question_select on public.questions(status,subject,skill,difficulty);
create table public.test_sessions (id text primary key,user_id uuid not null references public.profiles(id) on delete cascade,type text not null,status text not null,created bigint not null,expires bigint,updated bigint not null,version integer not null default 0,data text not null,unique(id,user_id));
create index idx_session_user on public.test_sessions(user_id,status);
create table public.answers (session_id text not null,question_id text not null references public.questions(id),user_id uuid not null references public.profiles(id) on delete cascade,answer text not null,correct smallint not null check(correct in(0,1)),seconds double precision not null check(seconds>=0),updated bigint not null,primary key(session_id,question_id),foreign key(session_id,user_id) references public.test_sessions(id,user_id) on delete cascade);
create index idx_answer_user on public.answers(user_id);
create table public.question_exposure (user_id uuid not null references public.profiles(id) on delete cascade,question_id text not null references public.questions(id),first_seen bigint not null,last_seen bigint not null,times_seen integer not null,session_id text not null,session_type text not null,primary key(user_id,question_id),foreign key(session_id,user_id) references public.test_sessions(id,user_id) on delete cascade);
create table public.results (session_id text primary key,user_id uuid not null references public.profiles(id) on delete cascade,created bigint not null,data text not null,foreign key(session_id,user_id) references public.test_sessions(id,user_id) on delete cascade);
create index idx_results_user on public.results(user_id);
create table public.mistakes (user_id uuid not null references public.profiles(id) on delete cascade,question_id text not null references public.questions(id),original_answer text not null,created bigint not null,status text not null default 'Needs Review',primary key(user_id,question_id));
create table public.mock_tests (id text primary key,title text not null,data text not null,status text not null default 'draft');
create table public.content_batches (id text primary key,user_id text not null,created bigint not null,data text not null);

create function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.profiles(id,email,display_name,avatar_url)
  values(new.id,lower(new.email),coalesce(new.raw_user_meta_data->>'display_name',new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name'),new.raw_user_meta_data->>'avatar_url')
  on conflict(id) do nothing;
  return new;
end $$;
revoke all on function public.handle_new_user() from public;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
-- Also support Auth users created before this migration.
insert into public.profiles(id,email,display_name,avatar_url)
select id,lower(email),coalesce(raw_user_meta_data->>'display_name',raw_user_meta_data->>'full_name',raw_user_meta_data->>'name'),raw_user_meta_data->>'avatar_url' from auth.users where email is not null on conflict(id) do nothing;

create function public.sync_auth_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
  update public.profiles set email=lower(new.email),display_name=coalesce(display_name,new.raw_user_meta_data->>'display_name',new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name'),avatar_url=coalesce(avatar_url,new.raw_user_meta_data->>'avatar_url'),updated_at=now() where id=new.id;
  return new;
end $$;
revoke all on function public.sync_auth_profile() from public;
create trigger on_auth_user_updated after update of email,raw_user_meta_data on auth.users for each row execute function public.sync_auth_profile();

create function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.profiles where id=(select auth.uid()) and role='admin') $$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- The server holds the encrypted pooler connection string. Each request sets
-- its verified Auth UUID and assumes this non-login, non-bypass role inside a
-- transaction. Browser clients cannot assume it. No service-role key is used.
do $$ begin if not exists(select 1 from pg_roles where rolname='rayan_app') then create role rayan_app nologin noinherit nobypassrls; end if; end $$;
grant rayan_app to postgres;
grant usage on schema public,auth to rayan_app;
grant execute on function auth.uid(),public.is_admin() to rayan_app;
grant select,insert,update,delete on public.profiles,public.rate_limits,public.passages,public.questions,public.test_sessions,public.answers,public.question_exposure,public.results,public.mistakes,public.mock_tests,public.content_batches to rayan_app;

alter table public.profiles enable row level security;
alter table public.rate_limits enable row level security;
alter table public.passages enable row level security;
alter table public.questions enable row level security;
alter table public.test_sessions enable row level security;
alter table public.answers enable row level security;
alter table public.question_exposure enable row level security;
alter table public.results enable row level security;
alter table public.mistakes enable row level security;
alter table public.mock_tests enable row level security;
alter table public.content_batches enable row level security;

create policy profile_read on public.profiles for select to authenticated,rayan_app using(id=(select auth.uid()) or public.is_admin());
create policy profile_browser_edit on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy profile_server_insert on public.profiles for insert to rayan_app with check(id=(select auth.uid()) and role='student');
create policy profile_server_update on public.profiles for update to rayan_app using(id=(select auth.uid())) with check(id=(select auth.uid()));

create policy sessions_read on public.test_sessions for select to authenticated using(user_id=(select auth.uid()));
create policy sessions_server on public.test_sessions to rayan_app using(user_id=(select auth.uid()) or public.is_admin()) with check(user_id=(select auth.uid()));
create policy answers_read on public.answers for select to authenticated using(user_id=(select auth.uid()));
create policy answers_server on public.answers to rayan_app using(user_id=(select auth.uid()) or public.is_admin()) with check(user_id=(select auth.uid()));
create policy exposure_read on public.question_exposure for select to authenticated using(user_id=(select auth.uid()));
create policy exposure_server on public.question_exposure to rayan_app using(user_id=(select auth.uid()) or public.is_admin()) with check(user_id=(select auth.uid()));
create policy results_read on public.results for select to authenticated using(user_id=(select auth.uid()));
create policy results_server on public.results to rayan_app using(user_id=(select auth.uid()) or public.is_admin()) with check(user_id=(select auth.uid()));
create policy mistakes_read on public.mistakes for select to authenticated using(user_id=(select auth.uid()));
create policy mistakes_server on public.mistakes to rayan_app using(user_id=(select auth.uid()) or public.is_admin()) with check(user_id=(select auth.uid()));
create policy rates_server on public.rate_limits to rayan_app using(true) with check(true);
create policy passages_server_read on public.passages for select to rayan_app using(true);
create policy passages_server_write on public.passages to rayan_app using(public.is_admin()) with check(public.is_admin());
create policy questions_server_read on public.questions for select to rayan_app using(true);
create policy questions_server_insert on public.questions for insert to rayan_app with check(auth.uid() is not null);
create policy questions_server_edit on public.questions for update to rayan_app using(public.is_admin()) with check(public.is_admin());
create policy questions_server_delete on public.questions for delete to rayan_app using(public.is_admin());
create policy mocks_server on public.mock_tests to rayan_app using(status='approved' or public.is_admin()) with check(public.is_admin());
create policy batches_server on public.content_batches to rayan_app using(id='initial-library-v1' or public.is_admin()) with check(user_id=(select auth.uid())::text and public.is_admin());

-- The Data API exposes only each student's readable progress and editable
-- display fields. Answer keys, grading writes, role changes and rate limits
-- remain inaccessible to browser clients.
revoke all on public.profiles,public.rate_limits,public.passages,public.questions,public.test_sessions,public.answers,public.question_exposure,public.results,public.mistakes,public.mock_tests,public.content_batches from anon,authenticated;
grant select on public.profiles,public.test_sessions,public.answers,public.question_exposure,public.results,public.mistakes to authenticated;
grant update(display_name,avatar_url) on public.profiles to authenticated;
create view public.question_catalog with(security_barrier=true) as select id,subject,skill,difficulty from public.questions where status='approved';
grant select on public.question_catalog to authenticated;

-- Account deletion is self-only and callable by the server role, never through
-- the browser Data API. Supabase Auth owns all credentials/session records.
create function public.delete_my_account() returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  delete from auth.users where id=auth.uid();
end $$;
revoke all on function public.delete_my_account() from public,anon,authenticated;
grant execute on function public.delete_my_account() to rayan_app;
