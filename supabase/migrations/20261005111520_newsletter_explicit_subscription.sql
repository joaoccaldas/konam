-- Existing accounts join through an explicit action; never by visiting a page.
-- The caller cannot supply an address, user ID or verification flag.
create function public.subscribe_intern_newsletter()
returns text language plpgsql security definer set search_path='' as $$
declare u auth.users; result text;
begin
  select * into u from auth.users where id=auth.uid();
  if u.id is null or u.email is null or u.email_confirmed_at is null then
    raise exception 'Confirm your email before subscribing' using errcode='42501';
  end if;
  insert into public.newsletter_subscriptions(email,status,user_id,confirmed_at,source)
  values(lower(trim(u.email)),'active',u.id,u.email_confirmed_at,'newsletter-explicit-consent')
  on conflict(email) do update set status='active',user_id=excluded.user_id,
    confirmed_at=excluded.confirmed_at,source=excluded.source,updated_at=now()
    where newsletter_subscriptions.status in ('pending','unsubscribed');
  select status into result from public.newsletter_subscriptions where email=lower(trim(u.email));
  return result;
end $$;
revoke all on function public.subscribe_intern_newsletter() from public,anon;
grant execute on function public.subscribe_intern_newsletter() to authenticated;
comment on function public.subscribe_intern_newsletter() is 'Explicit newsletter opt-in for the signed-in, email-confirmed owner. No identity arguments; suppression cannot be undone.';
