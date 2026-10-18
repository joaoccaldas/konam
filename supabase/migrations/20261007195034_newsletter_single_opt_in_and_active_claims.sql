alter table public.newsletter_subscriptions
  alter column status set default 'active';

update public.newsletter_subscriptions
set status='active', updated_at=now()
where status='pending';

create or replace function public.claim_newsletter_drafts(p_edition_id text,p_limit integer default 25)
returns table(email text,subject text,html text)
language plpgsql security definer set search_path='' as $$
begin
  if p_limit not between 1 and 100 then raise exception 'Invalid batch size';end if;
  return query with claimed as (
    insert into public.newsletter_drafts(edition_id,email)
    select p_edition_id,s.email
    from public.newsletter_subscriptions s
    where s.status='active'
      and exists(
        select 1 from public.newsletter_editions e
        where e.id=p_edition_id and e.review_draft_id is not null
      )
      and not exists(
        select 1 from public.newsletter_drafts d
        where d.edition_id=p_edition_id and d.email=s.email
      )
    order by s.email
    limit p_limit
    on conflict do nothing
    returning newsletter_drafts.email
  )
  select s.email,e.subject,replace(
      e.html,
      '{{UNSUBSCRIBE_URL}}',
      'https://mtvpnoqwjpoqaiocrklq.supabase.co/functions/v1/newsletter-subscribe?unsubscribe='||s.unsubscribe_token
    )
  from claimed c
  join public.newsletter_subscriptions s on s.email=c.email
  join public.newsletter_editions e on e.id=p_edition_id;
end $$;

revoke all on function public.claim_newsletter_drafts(text,integer) from public,anon,authenticated;
grant execute on function public.claim_newsletter_drafts(text,integer) to service_role;

comment on table public.newsletter_subscriptions is
  'Kona.m explicit single-opt-in newsletter registry. New explicit signups are active immediately. Unsubscribed and suppressed remain delivery stops until an explicit allowed re-subscribe flow changes them. Browser roles have no direct access; writes are mediated by the rate-limited newsletter Edge Function.';
