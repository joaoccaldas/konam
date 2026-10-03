alter table public.site_analytics_events
  drop constraint if exists site_analytics_events_event_type_check;

alter table public.site_analytics_events
  add constraint site_analytics_events_event_type_check
  check (event_type in (
    'page_view','entry_continue','world_opened','garage_opened','discover_opened',
    'plan_opened','me_opened','share_invoked','install_invoked',
    'first_bike_shown','first_bike_collected','first_bike_skipped',
    'kona_now_feed_opened','kona_now_travel_opened',
    'feedback_useful_yes','feedback_useful_no','session_engaged_15s','runtime_error'
  ));

alter table public.site_analytics_events
  add column if not exists landing_path text,
  add column if not exists traffic_class text;

alter table public.site_analytics_events
  drop constraint if exists site_analytics_events_landing_path_check,
  drop constraint if exists site_analytics_events_traffic_class_check;

alter table public.site_analytics_events
  add constraint site_analytics_events_landing_path_check
    check (landing_path is null or (char_length(landing_path) between 1 and 240 and landing_path like '/%')),
  add constraint site_analytics_events_traffic_class_check
    check (traffic_class is null or traffic_class in ('public','qa','automation'));

create index if not exists site_analytics_events_traffic_time_idx
  on public.site_analytics_events (traffic_class, occurred_at desc);

create index if not exists site_analytics_events_landing_time_idx
  on public.site_analytics_events (landing_path, occurred_at desc)
  where landing_path is not null;

comment on table public.site_analytics_events is
  'Kona.m privacy-minimal product analytics and coarse runtime health. Session-only acquisition context includes landing path, external referring hostname, UTM campaign values and a public/qa/automation traffic class. No account ID, email, IP address, user agent, raw error message, stack trace, raw feedback text, precise location or persistent cross-session visitor identifier is stored.';
