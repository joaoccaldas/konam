create table if not exists public.newsletter_subscriptions (
  email text primary key check (email = lower(trim(email))),
  status text not null default 'pending' check (status in ('pending','active','unsubscribed','suppressed')),
  consented_at timestamptz not null default now(),
  source text not null default 'app' check (char_length(source) between 1 and 80),
  locale text not null default 'en' check (char_length(locale) between 2 and 16),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.newsletter_subscriptions is
  'Kona.m explicit newsletter consent registry. Pending is not subscribed/active. Browser roles have no direct access; writes are mediated by the newsletter Edge Function.';

alter table public.newsletter_subscriptions enable row level security;

revoke all on table public.newsletter_subscriptions from anon, authenticated, service_role;
grant select, insert, update, delete on table public.newsletter_subscriptions to service_role;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public'
      and tablename='newsletter_subscriptions'
      and policyname='newsletter_browser_deny_all'
  ) then
    create policy newsletter_browser_deny_all
      on public.newsletter_subscriptions
      for all
      to anon, authenticated
      using (false)
      with check (false);
  end if;
end
$$;
