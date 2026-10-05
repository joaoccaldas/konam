# The Intern’s Kona.m newsletter

This extends **KONA.m Daily Draft**, the existing daily 18:30 Stockholm task.
It uses the existing connected public project Gmail account and preserves draft
review. Do not create a second schedule, sender, subscriber registry or send job.

## Registration and consent

`registerAccount` records the unchecked-by-default `kona_newsletter` choice in
the new Auth signup. The server activates the existing
`public.newsletter_subscriptions` row only after the Auth-managed email is
confirmed, and only for an explicit version-1 `kona-intern` choice. An old anonymous
request is not sufficient. The callback and password login retry deferred
activation using an authenticated RPC that accepts no caller-supplied identity.
Withdrawn and suppressed addresses are never reactivated by retries.

The registry, edition history, unsubscribe tokens and per-recipient draft receipts
are private. Anonymous and authenticated browser roles cannot read those tables
or claim newsletter recipients. Recipient queries also recheck the current Auth
email, so an old address is not used after an account changes its email.

## Existing daily task: subscriber wiring

Append this instruction to the existing task; retain its time, review recipient,
source verification, exactly-three-story rule and **never send automatically**:

> Follow the current `docs/NEWSLETTER.md` and canonical renderer in the Kona.m
> GitHub repository. After validating three original sources and publication
> dates, deduplicating against private `newsletter_editions.stories`, and making
> the existing operator review draft, store the canonical edition and that Gmail
> draft ID in Supabase. Use the private draft-claim function below. Create one
> unsent Gmail draft per returned recipient, using the returned personalized HTML
> and subject. Record the Gmail draft ID before continuing. Never put recipients
> or unsubscribe tokens in public files, output, notifications or CC/BCC. Never
> send drafts automatically. Reconcile any `preparing` receipt with existing Gmail
> drafts before retrying; flag ambiguity instead of creating duplicates.

1. Keep the existing source registry and refresh/fallback behavior. On the first
   wired run also compare with the original Gmail sent/draft editions; an empty
   new edition table is not proof that no story has already been used. Verify facts,
   canonical HTTPS URLs and actual publication dates. No duplicate prior story.
   Do not import an incomplete edition or select unverified filler.
2. Render using `newsletter/render.mjs` (`prepareNewsletter`) with `edition_date`,
   `intro`, `intern_currently` and three `stories`. Each story has `category`,
   `published_at` (YYYY-MM-DD), `source`, `url`, `headline`, `summary`, `intern` and
   `verified:true` after the editorial checks. The renderer escapes content and
   preserves the existing sand/lava/sunrise/ocean and Intern visual language.
   `newsletter/prepare.mjs` can write the private HTML and SQL outside tracked
   files. Keep the `{{UNSUBSCRIBE_URL}}` placeholder until recipient claiming.
3. Using the connected Supabase operator tool/service role, insert the edition in
   `newsletter_editions` with its stable date ID. Reuse the existing Gmail operator
   draft for that edition, then set `review_draft_id` to its **draft ID**, not its
   message ID. Re-running the edition must not overwrite existing draft receipts.
4. Claim up to 25 verified, active recipients:

   ```sql
   select * from public.claim_newsletter_drafts('intern-YYYY-MM-DD',25);
   ```

   The claim returns private `email`, `subject` and `html`. Pending, withdrawn,
   suppressed, unverified and already-claimed recipients are excluded. Each HTML
   has the recipient’s real opaque unsubscribe URL; no account sign-in is required.
5. Use the existing Gmail connector **create_draft**, from the connected public
   project account, `to` the single returned email, with `text/html` content. Do
   not change the task’s review-only delivery policy. Record each receipt:

   ```sql
   update public.newsletter_drafts
   set state='drafted',gmail_draft_id='GMAIL_DRAFT_ID',updated_at=now()
   where edition_id='intern-YYYY-MM-DD' and email='RECIPIENT_EMAIL'
     and state='preparing';
   ```

6. Before a human sends a subscriber draft, recheck that its registry row remains
   active and the Auth email still matches. Cancel stale recipient drafts using
   Gmail draft controls; withdrawing after draft creation must stop future sends.
   Only a reviewed, explicitly authorized draft can be sent. This workflow has no
   automatic send step. A prepared draft is not evidence of delivery.

## Unsubscribe

The existing `newsletter-subscribe` function redirects the random-token link to
the branded confirmation mode in the existing Kona.m account shell. Hosted
Supabase rewrites HTML to plain text on its shared domain, so HTML stays in the
public app and the function remains a JSON API. GET does not mutate consent, so mail
link scanners cannot unsubscribe. The confirmation page strips the token from the address bar without storing it.
Its explicit confirmation POST withdraws only that
token’s subscription, preserves suppression and returns no email/address status.
Malformed and oversized requests are denied. Subsequent confirmed-account retries
cannot undo the withdrawal.

## Validation and deployment limits

`supabase/tests/newsletter.sql` checks the state transitions, ownership boundaries,
private table/RPC grants and duplicate draft claims in a rolled-back transaction.
The real GoTrue + Mailpit CI flow checks signup metadata and activation only after
opening the account confirmation email. Handler tests check link scanners, token
scope and bounded forms. Browser checks cover optional consent and responsive
registration. Renderer tests check source/date gates and HTML escaping.

Hosted account confirmation still depends on configured Supabase email delivery.
The ChatGPT task editor requires the operator’s signed-in session; deploying this
repository does not itself update that external scheduled prompt. Check that the
existing task contains the subscriber wiring above before claiming daily recipient
drafts are automated. Never infer delivery from a pending request or draft.
