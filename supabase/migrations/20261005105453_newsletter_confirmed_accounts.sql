-- Extend the existing registry. Anonymous requests remain pending.
alter table public.newsletter_subscriptions
  add column user_id uuid references auth.users(id) on delete set null,
  add column confirmed_at timestamptz,
  add column newsletter_id text not null default 'kona-intern' check (newsletter_id='kona-intern'),
  add column unsubscribe_token text not null default
    (replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-',''));
create unique index newsletter_unsubscribe_token on public.newsletter_subscriptions(unsubscribe_token);
alter table public.newsletter_subscriptions add constraint newsletter_token_format check(unsubscribe_token ~ '^[a-f0-9]{64}$');

create function public.activate_registration_newsletter(p_user_id uuid)
returns text language plpgsql security definer set search_path='' as $$
declare u auth.users; result text;
begin
  select * into u from auth.users where id=p_user_id;
  -- Metadata is a consent choice, never an identity/permission claim. Ownership
  -- and confirmation come from the Auth-managed columns on this server row.
  if u.id is null or u.email_confirmed_at is null or u.email is null or
     u.raw_user_meta_data->'kona_newsletter' is distinct from
       '{"id":"kona-intern","version":1,"opt_in":true}'::jsonb then return 'not_requested';end if;
  insert into public.newsletter_subscriptions(email,status,user_id,confirmed_at,source)
  values(lower(trim(u.email)),'active',u.id,u.email_confirmed_at,'account-registration')
  on conflict(email) do update set status='active',user_id=excluded.user_id,
    confirmed_at=excluded.confirmed_at,source=excluded.source,updated_at=now()
    where newsletter_subscriptions.status='pending';
  select status into result from public.newsletter_subscriptions where email=lower(trim(u.email));
  return result;
end $$;
revoke all on function public.activate_registration_newsletter(uuid) from public,anon,authenticated;
grant execute on function public.activate_registration_newsletter(uuid) to service_role;

create function public.confirm_registration_newsletter()
returns text language sql security definer set search_path='' as $$
  select public.activate_registration_newsletter(auth.uid());
$$;
revoke all on function public.confirm_registration_newsletter() from public,anon;
grant execute on function public.confirm_registration_newsletter() to authenticated,service_role;

create function public.on_newsletter_email_confirmed()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  perform public.activate_registration_newsletter(new.id);
  return new;
exception when others then
  -- An optional newsletter failure must not prevent creating/signing into an
  -- account. The same operation is safely retried after authenticated sign-in.
  raise warning 'Newsletter activation deferred';return new;
end $$;
revoke all on function public.on_newsletter_email_confirmed() from public,anon,authenticated;
create trigger newsletter_on_confirmed_insert after insert on auth.users
  for each row when(new.email_confirmed_at is not null)
  execute function public.on_newsletter_email_confirmed();
create trigger newsletter_on_email_confirmation after update of email_confirmed_at on auth.users
  for each row when(old.email_confirmed_at is null and new.email_confirmed_at is not null and old.email=new.email)
  execute function public.on_newsletter_email_confirmed();

-- Private edition/draft receipts connect the same registry to the existing
-- Gmail review workflow. No browser role can list recipients or access tokens.
create table public.newsletter_editions (
  id text primary key check(id ~ '^[a-z0-9-]{1,80}$'),
  subject text not null check(char_length(subject) between 1 and 200),
  html text not null check(char_length(html) between 1 and 200000 and position('{{UNSUBSCRIBE_URL}}' in html)>0),
  stories jsonb not null check(jsonb_typeof(stories)='array' and jsonb_array_length(stories)=3),
  review_draft_id text,
  created_at timestamptz not null default now()
);
create table public.newsletter_drafts (
  edition_id text not null references public.newsletter_editions(id) on delete cascade,
  email text not null references public.newsletter_subscriptions(email) on delete cascade,
  state text not null default 'preparing' check(state in ('preparing','drafted','cancelled')),
  gmail_draft_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(edition_id,email),
  check(state<>'drafted' or gmail_draft_id is not null)
);
alter table public.newsletter_editions enable row level security;
alter table public.newsletter_drafts enable row level security;
revoke all on public.newsletter_editions,public.newsletter_drafts from public,anon,authenticated;
grant select,insert,update,delete on public.newsletter_editions,public.newsletter_drafts to service_role;

create function public.claim_newsletter_drafts(p_edition_id text,p_limit integer default 25)
returns table(email text,subject text,html text)
language plpgsql security definer set search_path='' as $$
begin
  if p_limit not between 1 and 100 then raise exception 'Invalid batch size';end if;
  return query with claimed as (
    insert into public.newsletter_drafts(edition_id,email)
    select p_edition_id,s.email from public.newsletter_subscriptions s
    join auth.users u on u.id=s.user_id and lower(trim(u.email))=s.email and u.email_confirmed_at is not null
    where s.status='active' and s.confirmed_at is not null and s.user_id is not null
      and exists(select 1 from public.newsletter_editions e where e.id=p_edition_id and e.review_draft_id is not null)
      and not exists(select 1 from public.newsletter_drafts d where d.edition_id=p_edition_id and d.email=s.email)
    order by s.email limit p_limit
    on conflict do nothing returning newsletter_drafts.email
  ) select s.email,e.subject,replace(e.html,'{{UNSUBSCRIBE_URL}}',
      'https://mtvpnoqwjpoqaiocrklq.supabase.co/functions/v1/newsletter-subscribe?unsubscribe='||s.unsubscribe_token)
    from claimed c join public.newsletter_subscriptions s on s.email=c.email
    join public.newsletter_editions e on e.id=p_edition_id;
end $$;
revoke all on function public.claim_newsletter_drafts(text,integer) from public,anon,authenticated;
grant execute on function public.claim_newsletter_drafts(text,integer) to service_role;

comment on table public.newsletter_editions is 'The Intern newsletter: exactly three source-verified stories, canonical HTML, Gmail operator review draft receipt.';
comment on table public.newsletter_drafts is 'Private per-recipient Gmail draft receipts; never auto-send. A preparing row is a claimed lease requiring Gmail reconciliation before retry.';
