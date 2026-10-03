# Kona.m site analytics v1

## What this measures

The public landing app emits privacy-minimal first-party events to the existing Kona.m Supabase project.

Tracked events:
- page_view
- entry_continue
- world_opened
- garage_opened
- discover_opened
- plan_opened
- me_opened
- share_invoked
- install_invoked

## Privacy boundary

Stored:
- server timestamp
- event type
- pathname
- coarse surface
- referring hostname only
- random session-scoped UUID
- coarse viewport: phone / tablet / desktop
- optional UTM source / medium / campaign

Not stored:
- name
- email
- Supabase/Auth user ID
- IP address
- user agent
- full referrer URL
- cookies
- persistent cross-session visitor identifier

The Edge Function may inspect the forwarded IP transiently for in-memory rate limiting, but it does not write the IP to the analytics table.

## Current public endpoint

Supabase Edge Function:
`site-analytics`

Database:
`public.site_analytics_events`

Browser roles have no table privileges. The Edge Function writes with the server-side service role.

## Core reports

### Page views today

```sql
select count(*) as page_views
from public.site_analytics_events
where event_type='page_view'
  and occurred_at >= date_trunc('day', now());
```

### Sessions today

A session is one browser-tab/sessionStorage lifetime, not a unique person.

```sql
select count(distinct session_id) as sessions
from public.site_analytics_events
where occurred_at >= date_trunc('day', now());
```

### Daily traffic

```sql
select
  date_trunc('day', occurred_at) as day,
  count(*) filter (where event_type='page_view') as page_views,
  count(distinct session_id) as sessions
from public.site_analytics_events
group by 1
order by 1 desc;
```

### Top surfaces

```sql
select surface, count(*) as events
from public.site_analytics_events
where occurred_at >= now() - interval '7 days'
group by surface
order by events desc;
```

### Referrers

```sql
select coalesce(referrer_host,'direct') as referrer, count(*) as page_views
from public.site_analytics_events
where event_type='page_view'
  and occurred_at >= now() - interval '7 days'
group by 1
order by page_views desc;
```

### First-run funnel

```sql
select event_type, count(*) as events, count(distinct session_id) as sessions
from public.site_analytics_events
where occurred_at >= now() - interval '7 days'
group by event_type
order by events desc;
```

## Important interpretation

`count(distinct session_id)` means anonymous browser sessions, not unique humans. Closing/reopening a tab, using another browser/device, or cleared session storage creates another session. This is intentional to avoid persistent user tracking.
