
create table if not exists public.site_analytics_events (
  event_id uuid primary key,
  occurred_at timestamptz not null default now(),
  event_type text not null check (event_type in (
    'page_view',
    'entry_continue',
    'world_opened',
    'garage_opened',
    'discover_opened',
    'plan_opened',
    'me_opened',
    'share_invoked',
    'install_invoked'
  )),
  path text not null check (char_length(path) between 1 and 240),
  surface text check (surface is null or char_length(surface) <= 80),
  referrer_host text check (referrer_host is null or char_length(referrer_host) <= 160),
  session_id uuid not null,
  viewport text check (viewport is null or viewport in ('phone','tablet','desktop')),
  campaign_source text check (campaign_source is null or char_length(campaign_source) <= 100),
  campaign_medium text check (campaign_medium is null or char_length(campaign_medium) <= 100),
  campaign_name text check (campaign_name is null or char_length(campaign_name) <= 140)
);

comment on table public.site_analytics_events is
  'Kona.m privacy-minimal product analytics. No account ID, email, IP address, user agent, or persistent cross-session visitor identifier is stored.';

create index if not exists site_analytics_events_occurred_at_idx
  on public.site_analytics_events (occurred_at desc);
create index if not exists site_analytics_events_type_time_idx
  on public.site_analytics_events (event_type, occurred_at desc);
create index if not exists site_analytics_events_session_time_idx
  on public.site_analytics_events (session_id, occurred_at desc);

alter table public.site_analytics_events enable row level security;

revoke all on table public.site_analytics_events from anon, authenticated;
grant select, insert, update, delete on table public.site_analytics_events to service_role;

