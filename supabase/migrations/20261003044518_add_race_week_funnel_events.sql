alter table public.site_analytics_events
  drop constraint if exists site_analytics_events_event_type_check;

alter table public.site_analytics_events
  add constraint site_analytics_events_event_type_check
  check (event_type in (
    'page_view','entry_continue','world_opened','garage_opened','discover_opened',
    'plan_opened','me_opened','share_invoked','install_invoked',
    'first_bike_shown','first_bike_collected','first_bike_skipped',
    'kona_now_feed_opened','kona_now_travel_opened',
    'feedback_useful_yes','feedback_useful_no'
  ));
