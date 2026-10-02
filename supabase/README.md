# Supabase migrations

This directory is the reproducible database-change record.

The production project received the first least-privilege migration on 30 Sep 2026. It removes TRUNCATE, REFERENCES and TRIGGER from the authenticated role on public.user_app_state while preserving CRUD subject to RLS.

Rules:
- every production DDL/grant/policy change gets a migration file here
- no manual production SQL without a matching migration receipt
- migrations must not contain secrets or private user data
- RLS/policy changes require tests/advisor checks
