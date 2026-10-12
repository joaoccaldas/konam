-- Transactional database contract tests, not a simulated successful public signup.
begin;
insert into auth.users(id,email,raw_user_meta_data) values
 ('00000000-0000-4000-8000-000000000011','newsletter-ci-optin@example.test','{"kona_newsletter":{"id":"kona-intern","version":1,"opt_in":true}}'),
 ('00000000-0000-4000-8000-000000000012','newsletter-ci-decline@example.test','{"kona_newsletter":{"id":"kona-intern","version":1,"opt_in":false}}'),
 ('00000000-0000-4000-8000-000000000013','newsletter-ci-anonymous@example.test','{}');
insert into public.newsletter_subscriptions(email,status) values('newsletter-ci-anonymous@example.test','pending');
do $$begin
 if public.activate_registration_newsletter('00000000-0000-4000-8000-000000000011')<>'not_requested' then raise exception 'unverified activation';end if;
 if exists(select 1 from public.newsletter_subscriptions where email='newsletter-ci-optin@example.test') then raise exception 'unverified newsletter row';end if;
end $$;
update auth.users set email_confirmed_at=now() where id in
 ('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000013');
do $$begin
 if not exists(select 1 from public.newsletter_subscriptions where email='newsletter-ci-optin@example.test' and status='active' and confirmed_at is not null and user_id='00000000-0000-4000-8000-000000000011') then raise exception 'confirmed opt-in not activated';end if;
 if exists(select 1 from public.newsletter_subscriptions where email='newsletter-ci-decline@example.test') then raise exception 'declined user subscribed';end if;
 if not exists(select 1 from public.newsletter_subscriptions where email='newsletter-ci-anonymous@example.test' and status='pending') then raise exception 'anonymous pending silently activated';end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000012',true);
do $$begin
 if public.confirm_registration_newsletter()<>'not_requested' then raise exception 'caller identity leak';end if;
 if has_function_privilege('authenticated','public.activate_registration_newsletter(uuid)','EXECUTE') then raise exception 'caller can supply another identity';end if;
 if has_function_privilege('authenticated','public.claim_newsletter_drafts(text,integer)','EXECUTE') then raise exception 'browser can claim recipients';end if;
 if has_table_privilege('authenticated','public.newsletter_editions','SELECT') or has_table_privilege('authenticated','public.newsletter_drafts','SELECT') then raise exception 'browser can read editions/recipients';end if;
end $$;
reset role;
set local role anon;
do $$begin
 if has_function_privilege('anon','public.confirm_registration_newsletter()','EXECUTE') or has_function_privilege('anon','public.claim_newsletter_drafts(text,integer)','EXECUTE') or has_table_privilege('anon','public.newsletter_drafts','SELECT') then raise exception 'anonymous newsletter privilege';end if;
end $$;
reset role;
insert into public.newsletter_editions(id,subject,html,stories) values('newsletter-ci','CI review','<p>{{UNSUBSCRIBE_URL}}</p>','[{},{},{}]');
set local role service_role;
do $$begin
 if exists(select 1 from public.claim_newsletter_drafts('newsletter-ci',25)) then raise exception 'unreviewed edition claimed';end if;
end $$;
update public.newsletter_editions set review_draft_id='ci-not-a-real-gmail-draft' where id='newsletter-ci';
do $$declare r record;n integer:=0;begin
 for r in select * from public.claim_newsletter_drafts('newsletter-ci',25) loop
   n:=n+1;
   if r.email<>'newsletter-ci-optin@example.test' or r.html not like '%newsletter-subscribe?unsubscribe=%' or r.html like '%{{UNSUBSCRIBE_URL}}%' then raise exception 'wrong recipient/token interpolation';end if;
 end loop;
 if n<>1 then raise exception 'wrong recipient count: %',n;end if;
 if exists(select 1 from public.claim_newsletter_drafts('newsletter-ci',25)) then raise exception 'duplicate claim';end if;
end $$;
update public.newsletter_subscriptions set status='unsubscribed' where email='newsletter-ci-optin@example.test';
do $$begin
 if public.activate_registration_newsletter('00000000-0000-4000-8000-000000000011')<>'unsubscribed' then raise exception 'withdrawal undone';end if;
end $$;
update public.newsletter_subscriptions set status='suppressed' where email='newsletter-ci-optin@example.test';
do $$begin
 if public.activate_registration_newsletter('00000000-0000-4000-8000-000000000011')<>'suppressed' then raise exception 'suppression undone';end if;
end $$;
reset role;
-- Explicit opt-in is available to a previously declining verified owner.
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000012',true);
do $$begin
 if public.subscribe_intern_newsletter()<>'active' then raise exception 'explicit owner consent not active';end if;
 if public.subscribe_intern_newsletter()<>'active' then raise exception 'duplicate explicit consent not idempotent';end if;
end $$;
reset role;
do $$begin
 if not exists(select 1 from public.newsletter_subscriptions where email='newsletter-ci-decline@example.test' and user_id='00000000-0000-4000-8000-000000000012' and source='newsletter-explicit-consent') then raise exception 'wrong explicit owner';end if;
 if has_function_privilege('anon','public.subscribe_intern_newsletter()','EXECUTE') then raise exception 'anonymous explicit consent privilege';end if;
end $$;
update public.newsletter_subscriptions set status='unsubscribed' where email='newsletter-ci-decline@example.test';
set local role authenticated;
do $$begin
 if public.subscribe_intern_newsletter()<>'active' then raise exception 'explicit resubscribe failed';end if;
end $$;
reset role;
update public.newsletter_subscriptions set status='suppressed' where email='newsletter-ci-decline@example.test';
set local role authenticated;
do $$begin
 if public.subscribe_intern_newsletter()<>'suppressed' then raise exception 'explicit consent undid suppression';end if;
end $$;
reset role;
insert into auth.users(id,email) values('00000000-0000-4000-8000-000000000014','newsletter-ci-unverified@example.test');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000014',true);
do $$begin
 begin
  perform public.subscribe_intern_newsletter();
  raise exception 'unverified explicit subscription accepted';
 exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
