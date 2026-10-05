-- Shared quotas survive Edge isolate restarts and concurrent instances.
-- Keys are HMAC(endpoint, time window, IP), never raw IPs or session IDs.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;
create table private.edge_rate_limits (
  endpoint text not null check(endpoint in ('companion','site-analytics','newsletter-subscribe')),
  bucket_window timestamptz not null,
  bucket_key text not null check(bucket_key='global' or bucket_key ~ '^[0-9a-f]{64}$'),
  requests integer not null check(requests>0),
  expires_at timestamptz not null,
  primary key(endpoint,bucket_window,bucket_key)
);
alter table private.edge_rate_limits enable row level security;
revoke all on private.edge_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on private.edge_rate_limits to service_role;
create index edge_rate_limits_expiry on private.edge_rate_limits(expires_at);
create function public.consume_edge_quota(p_endpoint text,p_key text,p_window timestamptz)
returns boolean language plpgsql security invoker set search_path='' as $$
declare
  per_client integer; total_limit integer; seconds integer; accepted integer;
begin
  case p_endpoint
    when 'companion' then per_client:=45;total_limit:=1000;seconds:=60;
    when 'site-analytics' then per_client:=240;total_limit:=20000;seconds:=3600;
    when 'newsletter-subscribe' then per_client:=8;total_limit:=500;seconds:=3600;
    else raise exception 'Unknown endpoint';
  end case;
  if p_key is null or p_key !~ '^[0-9a-f]{64}$' or p_window is null or
    p_window != to_timestamp(floor(extract(epoch from now())/seconds)*seconds) then
    raise exception 'Invalid quota window';
  end if;
  insert into private.edge_rate_limits as r values(p_endpoint,p_window,p_key,1,p_window+make_interval(secs=>seconds+60))
    on conflict(endpoint,bucket_window,bucket_key) do update set requests=r.requests+1
    where r.requests<per_client returning requests into accepted;
  if accepted is null then return false; end if;
  accepted:=null;
  insert into private.edge_rate_limits as r values(p_endpoint,p_window,'global',1,p_window+make_interval(secs=>seconds+60))
    on conflict(endpoint,bucket_window,bucket_key) do update set requests=r.requests+1
    where r.requests<total_limit returning requests into accepted;
  return accepted is not null;
end $$;
revoke all on function public.consume_edge_quota(text,text,timestamptz) from public, anon, authenticated;
grant execute on function public.consume_edge_quota(text,text,timestamptz) to service_role;
comment on table private.edge_rate_limits is 'Short-lived abuse quotas. Per-window keyed hashes only; not product analytics or cross-session visitor tracking.';
select cron.schedule('konam-edge-quota-retention','*/10 * * * *',
  $$delete from private.edge_rate_limits where expires_at<now();$$);
