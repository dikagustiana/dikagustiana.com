-- ============================================================================
-- E2E TEST SEED  (safe for LOCAL / STAGING test databases only — never prod)
-- ----------------------------------------------------------------------------
-- Auto-applied by `supabase db reset`. Creates two known auth users so the
-- live e2e suite (tests/live/*) can exercise real auth, RLS, admin gating and
-- CRUD against an actual database.
--
--   admin@dika.test  / Admin123!   -> has role 'admin'  (user_roles)
--   user@dika.test   / User1234!    -> ordinary user
--
-- Passwords are obviously non-secret test fixtures.
-- ============================================================================

-- Fixed UUIDs so tests can reference users deterministically.
-- admin: 00000000-0000-0000-0000-0000000000a1
-- user : 00000000-0000-0000-0000-0000000000b2

-- Clean re-seed (idempotent on a fresh reset, harmless otherwise).
DELETE FROM auth.users WHERE email IN ('admin@dika.test', 'user@dika.test');

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
VALUES
  ('00000000-0000-0000-0000-000000000000',
   '00000000-0000-0000-0000-0000000000a1',
   'authenticated', 'authenticated', 'admin@dika.test',
   crypt('Admin123!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000',
   '00000000-0000-0000-0000-0000000000b2',
   'authenticated', 'authenticated', 'user@dika.test',
   crypt('User1234!', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', '');

-- Auth identities (gotrue requires an identity row with provider_id + sub).
INSERT INTO auth.identities (
  id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-0000000000a1',
   '00000000-0000-0000-0000-0000000000a1',
   '{"sub":"00000000-0000-0000-0000-0000000000a1","email":"admin@dika.test"}',
   'email', now(), now(), now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-0000000000b2',
   '00000000-0000-0000-0000-0000000000b2',
   '{"sub":"00000000-0000-0000-0000-0000000000b2","email":"user@dika.test"}',
   'email', now(), now(), now());

-- Grant the admin role. (profiles rows are created by the on_auth_user_created
-- trigger automatically.)
INSERT INTO public.user_roles (user_id, role)
VALUES ('00000000-0000-0000-0000-0000000000a1', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- One published essay so public-read + admin-write paths have a fixture.
INSERT INTO public.essays (section, slug, title, snippet, content, published, status, sort_order)
VALUES ('next-big-thing', 'seed-published-essay', 'Seed Published Essay',
        'Seeded for live e2e read tests.', 'Body.', true, 'published', 0)
ON CONFLICT (slug) DO NOTHING;
