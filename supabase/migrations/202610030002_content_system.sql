-- Additive migration: historical questions, answers and results are preserved.
create table if not exists public.content_requests (
 id text primary key, subtopic text not null, difficulty integer not null check(difficulty between 1 and 5),
 status text not null default 'queued' check(status in('queued','working','approved','rejected','paused')),
 requester uuid references public.profiles(id) on delete set null, created bigint not null, updated bigint not null,
 plan jsonb not null, output jsonb, review jsonb, model text, tokens integer not null default 0,
 reserved_cents numeric not null default 0, cost_cents numeric not null default 0, error text
);
create table if not exists public.content_budget (
 period text primary key, reserved_cents numeric not null default 0, spent_cents numeric not null default 0,
 constraint budget_nonnegative check(reserved_cents>=0 and spent_cents>=0)
);
create table if not exists public.content_audits (id text primary key,created bigint not null,data jsonb not null);
-- Private worker controls are never accessible through the browser Data API.
create table if not exists public.content_worker_config (
 id integer primary key check(id=1), secret text not null,
 enabled boolean not null default false, free_verified boolean not null default false,
 monthly_limit_cents integer not null default 500 check(monthly_limit_cents between 0 and 500),
 generation_model text, review_model text,
 updated bigint not null
);
alter table public.content_worker_config enable row level security;
revoke all on public.content_worker_config from anon,authenticated,rayan_app;
create index if not exists idx_question_subtopic on public.questions((data::jsonb->>'subtopic'),difficulty,status);
create index if not exists idx_question_family on public.questions((data::jsonb->>'familyId'),status);
create index if not exists idx_content_request_status on public.content_requests(status,updated);
create unique index if not exists idx_content_pending_target on public.content_requests(subtopic,difficulty) where status in('queued','working');
alter table public.content_requests enable row level security;
alter table public.content_budget enable row level security;
alter table public.content_audits enable row level security;
grant select,insert,update on public.content_requests to rayan_app;
create policy content_request_read on public.content_requests for select to rayan_app using(true);
create policy content_request_enqueue on public.content_requests for insert to rayan_app with check(requester=auth.uid());
create policy content_request_admin on public.content_requests for update to rayan_app using(public.is_admin()) with check(public.is_admin());
grant select on public.content_audits to rayan_app;
create policy content_audit_read on public.content_audits for select to rayan_app using(public.is_admin());
-- Only the trusted server role can insert validated authored/generated passages.
create policy passages_server_generated on public.passages for insert to rayan_app with check(auth.uid() is not null);
-- Browser Data API must not reveal silently graded active diagnostic answers.
drop policy if exists answers_read on public.answers;
create policy answers_read on public.answers for select to authenticated using(
 user_id=auth.uid() and exists(select 1 from public.test_sessions s where s.id=session_id and s.user_id=auth.uid() and (s.type<>'diagnostic' or s.status='complete'))
);
-- Aggregate progression fields are read through the authenticated application API.
revoke select on public.answers from authenticated;
