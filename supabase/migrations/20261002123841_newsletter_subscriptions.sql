create table if not exists public.newsletter_subscriptions (
  email text primary key,
  status text not null default 'pending' check (status in ('pending','active','unsubscribed','suppressed')),
  consented_at timestamptz not null default now(),
  source text not null default 'app' check (char_length(source) between 1 and 80),
  locale text not null default 'en' check (char_length(locale) between 2 and 16),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint newsletter_email_normalized check (email = lower(trim(email))),
  constraint newsletter_email_length check (char_length(email) between 3 and 254)
);
alter table public.newsletter_subscriptions enable row level security;
revoke all on table public.newsletter_subscriptions from anon, authenticated;
grant select, insert, update, delete on table public.newsletter_subscriptions to service_role;
comment on table public.newsletter_subscriptions is 'Kona.m explicit newsletter consent registry. Browser roles have no direct access; writes are mediated by a rate-limited Edge Function.';
