# Kona.m site analytics v2

## Scope

The public GitHub Pages app emits a small first-party event stream to the existing Kona.m Supabase project. The tracker is present on every public surface: directly on the landing page, injected by the hardener into About/Why/Field Guide and collection/studio/experiences, and loaded by the shared standalone-access runtime for the large bike exhibits. The packaged native app does not enable production analytics because the browser module only activates on the canonical GitHub Pages origin and when `window.__NATIVE` is absent.

Tracked launch events:
- page_view
- session_engaged_15s
- entry_continue
- first_bike_shown / first_bike_collected / first_bike_skipped
- kona_now_feed_opened / kona_now_travel_opened
- garage_opened / discover_opened / plan_opened / me_opened / world_opened
- share_invoked / install_invoked
- feedback_useful_yes / feedback_useful_no
- runtime_error with allowlisted coarse codes only

## Traffic quality

Each browser session is classified as one of:
- `public`: ordinary production traffic
- `qa`: explicit product/engineering testing
- `automation`: browser automation where `navigator.webdriver` is present

Use `?analytics_mode=qa` at the start of a QA session. The mode persists only in sessionStorage for that browser session. Use `?analytics_mode=off` to disable analytics for the current session.

Historical rows created before v2 have `traffic_class is null`. Do not silently count them as public traffic.

## First-touch attribution

At the beginning of the browser session the client captures and keeps, in sessionStorage only:
- landing pathname
- external referring hostname, excluding same-site referrals
- optional `utm_source`
- optional `utm_medium`
- optional `utm_campaign`

That first-touch context is attached to subsequent events in the same session, so attribution survives navigation after query parameters disappear.

## Privacy boundary

Stored:
- server timestamp
- event type
- current pathname
- first landing pathname
- coarse surface
- first external referring hostname only
- random session-scoped UUID
- coarse viewport: compact / medium / wide
- optional UTM source / medium / campaign
- traffic class: public / qa / automation
- coarse runtime-health fields where applicable

Not stored:
- name or email
- Supabase/Auth user ID
- IP address in the analytics table
- user agent
- full referrer URL
- cookies
- persistent cross-session visitor identifier
- free-text feedback
- raw error message or stack trace
- precise location

The Edge Function may inspect the forwarded IP transiently for in-memory rate limiting. It does not write the IP. A database cron job deletes analytics events after 30 days.

## Interpretation

A distinct `session_id` is a browser-tab/sessionStorage lifetime, not a unique human. Closing/reopening a tab, changing browser/device, or clearing session storage creates another session.

`session_engaged_15s` means the page was visibly active for an accumulated 15 seconds in that browser session. It is a useful quality signal, not proof of a unique person.

Feedback is a binary product signal only. It is intentionally not linked to RaceIdentity, account state, or a free-text response.

## Core reports

Headline traffic should use only v2 public rows:

```sql
select
  count(*) filter (where event_type='page_view') as page_views,
  count(distinct session_id) as sessions,
  count(distinct session_id) filter (where event_type='session_engaged_15s') as engaged_sessions
from public.site_analytics_events
where traffic_class='public'
  and occurred_at >= date_trunc('day', now());
```

Acquisition:

```sql
select
  coalesce(referrer_host,'(direct/none)') as referrer,
  coalesce(campaign_source,'(none)') as campaign_source,
  landing_path,
  count(distinct session_id) as sessions
from public.site_analytics_events
where traffic_class='public'
  and event_type='page_view'
  and occurred_at >= now() - interval '7 days'
group by 1,2,3
order by sessions desc;
```

Traffic-quality audit:

```sql
select coalesce(traffic_class,'legacy') as traffic_class,
       count(*) filter (where event_type='page_view') as page_views,
       count(distinct session_id) as sessions
from public.site_analytics_events
where occurred_at >= now() - interval '7 days'
group by 1
order by sessions desc;
```

Product funnel:

```sql
select event_type, count(*) as events, count(distinct session_id) as sessions
from public.site_analytics_events
where traffic_class='public'
  and occurred_at >= now() - interval '7 days'
group by event_type
order by events desc;
```

## Release rule

If the event vocabulary or stored analytics fields change, update together:
1. browser allowlist/click mapping,
2. Edge Function validation/allowlist,
3. database constraints,
4. privacy disclosure,
5. analytics tests,
6. reporting queries.

Do not add raw text, identity, health, precise location, advertising IDs, user-agent collection or fingerprinting to this stream.

Release candidate `d7fb3ea41325` is the first release sealed with the v2 analytics contract.

The v2 branch was rebased on the discovery-first game-economy release before final validation.
