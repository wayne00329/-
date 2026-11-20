-- Run this in the Supabase SQL Editor for your project.
create table if not exists public.tasks (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  date date not null,
  time time,
  category text not null default '個人',
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  note text not null default '',
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists tasks_user_date_time_idx on public.tasks (user_id, date, time);
alter table public.tasks enable row level security;

drop policy if exists "Users can read their own tasks" on public.tasks;
create policy "Users can read their own tasks" on public.tasks
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own tasks" on public.tasks;
create policy "Users can create their own tasks" on public.tasks
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own tasks" on public.tasks;
create policy "Users can update their own tasks" on public.tasks
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own tasks" on public.tasks;
create policy "Users can delete their own tasks" on public.tasks
  for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.tasks to authenticated;

-- Enable live cross-device updates. If this table is already in the publication,
-- the exception is intentionally ignored.
do $$
begin
  alter publication supabase_realtime add table public.tasks;
exception when duplicate_object then
  null;
end $$;
