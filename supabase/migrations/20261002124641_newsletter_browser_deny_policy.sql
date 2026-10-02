create policy "newsletter_browser_deny_all"
on public.newsletter_subscriptions
as restrictive
for all
to anon, authenticated
using (false)
with check (false);
