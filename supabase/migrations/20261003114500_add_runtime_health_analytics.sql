alter table public.site_analytics_events
  drop constraint if exists site_analytics_events_event_type_check;

alter table public.site_analytics_events
  add constraint site_analytics_events_event_type_check
  check (event_type in (
    'page_view','entry_continue','world_opened','garage_opened','discover_opened',
    'plan_opened','me_opened','share_invoked','install_invoked',
    'first_bike_shown','first_bike_collected','first_bike_skipped',
    'kona_now_feed_opened','kona_now_travel_opened',
    'feedback_useful_yes','feedback_useful_no','runtime_error'
  ));

alter table public.site_analytics_events
  add column if not exists event_code text,
  add column if not exists subsystem text,
  add column if not exists release_id text,
  add column if not exists online boolean;

alter table public.site_analytics_events
  drop constraint if exists site_analytics_events_event_code_check,
  drop constraint if exists site_analytics_events_subsystem_check,
  drop constraint if exists site_analytics_events_release_id_check;

alter table public.site_analytics_events
  add constraint site_analytics_events_event_code_check
    check (event_code is null or event_code in (
      'uncaught_js','unhandled_promise','renderer_init','renderer_context_lost',
      'renderer_context_restored','route_load','state_read','state_write','companion_load'
    )),
  add constraint site_analytics_events_subsystem_check
    check (subsystem is null or subsystem in (
      'runtime','renderer','navigation','storage','companion'
    )),
  add constraint site_analytics_events_release_id_check
    check (release_id is null or release_id ~ '^[0-9a-f]{12}$');

create index if not exists site_analytics_runtime_time_idx
  on public.site_analytics_events (event_type, event_code, occurred_at desc)
  where event_type='runtime_error';

comment on table public.site_analytics_events is
  'Kona.m privacy-minimal product analytics and coarse runtime health. No account ID, email, IP address, user agent, raw error message, stack trace, raw feedback text, or persistent cross-session visitor identifier is stored.';
