-- Real Postgres checks. Disposable identities and every write roll back.
begin;
insert into auth.users(id) values('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');
insert into public.user_app_state(user_id,state) values('00000000-0000-4000-8000-000000000002','{"test":true}');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
do $$begin
  if exists(select 1 from public.user_app_state where user_id='00000000-0000-4000-8000-000000000002') then raise exception 'cross-user read';end if;
  update public.user_app_state set state='{}' where user_id='00000000-0000-4000-8000-000000000002';
  if found then raise exception 'cross-user update';end if;
  delete from public.user_app_state where user_id='00000000-0000-4000-8000-000000000002';
  if found then raise exception 'cross-user delete';end if;
  begin
    insert into public.user_app_state(user_id) values('00000000-0000-4000-8000-000000000002');
    raise exception 'cross-user insert allowed';
  exception when insufficient_privilege then null;end;
  insert into public.user_app_state(user_id,state) values('00000000-0000-4000-8000-000000000001','{"test":true}');
  if not exists(select 1 from public.user_app_state where user_id='00000000-0000-4000-8000-000000000001') then raise exception 'own read denied';end if;
  update public.user_app_state set state='{}' where user_id='00000000-0000-4000-8000-000000000001';
  if not found then raise exception 'own update denied';end if;
  begin
    update public.user_app_state set user_id='00000000-0000-4000-8000-000000000003' where user_id='00000000-0000-4000-8000-000000000001';
    raise exception 'identity reassignment allowed';
  exception when insufficient_privilege then null;end;
  delete from public.user_app_state where user_id='00000000-0000-4000-8000-000000000001';
  if not found then raise exception 'own delete denied';end if;
  if has_table_privilege('authenticated','public.site_analytics_events','SELECT') or has_table_privilege('authenticated','public.newsletter_subscriptions','SELECT') then raise exception 'browser table grant';end if;
  if has_function_privilege('authenticated','public.consume_edge_quota(text,text,timestamptz)','EXECUTE') then raise exception 'browser quota grant';end if;
end $$;
reset role;
set local role anon;
do $$begin
  if has_table_privilege('anon','public.user_app_state','SELECT') or has_table_privilege('anon','public.site_analytics_events','INSERT') or has_table_privilege('anon','public.newsletter_subscriptions','INSERT') then raise exception 'anonymous table grant';end if;
  if has_function_privilege('anon','public.consume_edge_quota(text,text,timestamptz)','EXECUTE') then raise exception 'anonymous quota grant';end if;
end $$;
reset role;
set local role service_role;
do $$declare w timestamptz:=to_timestamp(floor(extract(epoch from now())/3600)*3600);i integer;k text:=repeat('0',64);begin
  for i in 1..8 loop
    if not public.consume_edge_quota('newsletter-subscribe',k,w) then raise exception 'quota rejected before limit';end if;
  end loop;
  if public.consume_edge_quota('newsletter-subscribe',k,w) then raise exception 'quota allowed past limit';end if;
  if not public.consume_edge_quota('newsletter-subscribe',repeat('1',64),w) then raise exception 'independent client denied';end if;
end $$;
rollback;
