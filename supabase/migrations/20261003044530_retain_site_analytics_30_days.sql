create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

do $$
declare job bigint;
begin
  for job in select jobid from cron.job where jobname='konam-site-analytics-retention'
  loop
    perform cron.unschedule(job);
  end loop;
end $$;

select cron.schedule(
  'konam-site-analytics-retention',
  '17 3 * * *',
  $$delete from public.site_analytics_events where occurred_at < now() - interval '30 days';$$
);
