-- Mirrors the production Supabase migration applied 2026-09-30.
-- Purpose: authenticated clients need CRUD only on their own RLS-scoped user_app_state row.
-- RLS policies remain the authorization boundary.
revoke truncate, references, trigger on table public.user_app_state from authenticated;
