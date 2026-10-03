alter table public.site_analytics_events
  drop constraint if exists site_analytics_events_viewport_check;

alter table public.site_analytics_events
  add constraint site_analytics_events_viewport_check
  check (viewport is null or viewport in ('compact','medium','wide'));
