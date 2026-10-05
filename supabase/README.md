# Supabase deployment record

Migrations are ordered for a clean Supabase reset and match the connected project's recorded versions. The first `user_app_state_baseline` adopts the pre-existing backup table, defaults, constraints and ownership policies. Its earlier version is a bootstrap ordering marker, not a claim that this adoption ran on that date. Adoption was checked and recorded on 5 October 2026; existing receipts and user rows were preserved. The next ten files reproduce the live historic statements rather than rewriting production history.

`20261005083032_edge_rate_limits.sql` adds atomic, service-role-only quotas shared by all Edge instances. The private table holds endpoint/window HMAC buckets; keys rotate every window, raw IPs are not stored, and the ten-minute cleanup job removes expired buckets. Client budgets are 45/minute for Companion, 240/hour for analytics and 8/hour for newsletter. Endpoint-wide ceilings also bound traffic when clients change IPs. Quota outages fail closed with 503; exhausted quotas return 429. Provider caches and the eight-request Companion concurrency guard remain instance-local performance controls.

`config.toml` records the existing public endpoint JWT mode. Handlers require the project publishable key; it is public, not an identity credential. Service-role access is used only in server handlers and never reaches browser bundles or feed publishers. `companion/public-config.json` deliberately contains only public configuration.

Validation:

```sh
supabase start
supabase db reset --local
psql 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' -v ON_ERROR_STOP=1 -f supabase/tests/security.sql
deno test --lock=supabase/functions/deno.lock --frozen --allow-read --allow-env supabase/functions/_shared/request_test.ts supabase/functions/companion/handler_test.ts supabase/functions/companion/providers_test.ts supabase/functions/site-analytics/handler_test.ts supabase/functions/newsletter-subscribe/handler_test.ts
```

The SQL test creates disposable identities inside a transaction, verifies own-account CRUD and cross-account denials, checks browser privilege denials and exercises quota exhaustion, then rolls every write back. Release security CI runs a clean Supabase reset and these checks. Deployment must include each function's relative `_shared` dependencies. After deploying, verify live endpoint responses, migration versions, RLS grants, retention jobs and advisors.

Public email sign-in remains unavailable until verified SMTP delivery and account erasure/retention procedures are ready. Leaked-password protection is still an Auth setting to resolve before public account launch. Do not disable browser denials or add a service key to the client to work around that boundary.
