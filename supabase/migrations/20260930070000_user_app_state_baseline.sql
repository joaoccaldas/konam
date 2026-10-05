-- Bootstrap the existing canonical backup table before the first historic migration.
-- Adopted from the live schema on 2026-10-05. Existing records are never replaced.
create table if not exists public.user_app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  schema_version integer not null default 1 check (schema_version > 0),
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.user_app_state enable row level security;
revoke all on public.user_app_state from anon, authenticated;
grant select, insert, update, delete on public.user_app_state to authenticated, service_role;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_app_state' and policyname='Users can read own app state') then
    create policy "Users can read own app state" on public.user_app_state for select to authenticated using ((select auth.uid())=user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_app_state' and policyname='Users can insert own app state') then
    create policy "Users can insert own app state" on public.user_app_state for insert to authenticated with check ((select auth.uid())=user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_app_state' and policyname='Users can update own app state') then
    create policy "Users can update own app state" on public.user_app_state for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_app_state' and policyname='Users can delete own app state') then
    create policy "Users can delete own app state" on public.user_app_state for delete to authenticated using ((select auth.uid())=user_id);
  end if;
end $$;
