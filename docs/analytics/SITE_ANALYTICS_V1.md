# Kona.m site analytics v1

## Scope

The public GitHub Pages app emits a deliberately small first-party event stream to the existing Kona.m Supabase project. The native bundle does not enable production analytics because the browser module only activates on the canonical GitHub Pages origin and when `window.__NATIVE` is absent.

Tracked launch events:
- page_view
- entry_continue
- first_bike_shown / first_bike_collected / first_bike_skipped
- kona_now_feed_opened / kona_now_travel_opened
- garage_opened / discover_opened / plan_opened / me_opened / world_opened
- share_invoked / install_invoked
- feedback_useful_yes / feedback_useful_no

## Privacy boundary

Stored:
- server timestamp
- event type
- pathname
- coarse surface
- referring hostname only
- random session-scoped UUID
- coarse viewport: compact / medium / wide
- optional UTM source / medium / campaign

Not stored:
- name or email
- Supabase/Auth user ID
- IP address in the analytics table
- user agent
- full referrer URL
- cookies
- persistent cross-session visitor identifier
- free-text feedback
- precise location

The Edge Function may inspect the forwarded IP transiently for in-memory rate limiting. It does not write the IP. A database cron job deletes analytics events after 30 days.

## Interpretation

A distinct `session_id` is a browser-tab/sessionStorage lifetime, not a unique human. Closing/reopening a tab, changing browser/device, or clearing session storage creates another session.

Feedback is a binary product signal only. It is intentionally not linked to RaceIdentity, account state, or a free-text response.

## Core reports

```sql
select count(*) as page_views
from public.site_analytics_events
where event_type='page_view'
  and occurred_at >= date_trunc('day', now());
```

```sql
select count(distinct session_id) as sessions
from public.site_analytics_events
where occurred_at >= date_trunc('day', now());
```

```sql
select event_type, count(*) as events, count(distinct session_id) as sessions
from public.site_analytics_events
where occurred_at >= now() - interval '7 days'
group by event_type
order by events desc;
```

## Release rule

If the event vocabulary changes, update together:
1. browser allowlist/click mapping,
2. Edge Function allowlist,
3. database check constraint,
4. privacy disclosure,
5. analytics tests.

Do not add raw text, identity, health, precise location, advertising IDs, or fingerprinting to this stream.
