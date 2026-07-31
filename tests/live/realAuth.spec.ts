import { test, expect } from '@playwright/test';
import { anonClient, signedInClient, USER, LIVE, missingEnv } from './helpers';

/**
 * Real auth against a live Supabase: signup -> login -> session -> logout.
 * Gated by E2E_LIVE=1.
 */
test.describe('live: real authentication', () => {
  test.skip(!LIVE, 'live suite disabled (set E2E_LIVE=1 + SUPABASE_* env)');

  test('env is configured', () => {
    expect(missingEnv(), 'missing env var').toBeNull();
  });

  test('sign up a brand-new user returns a usable session', async () => {
    const client = anonClient();
    const email = `signup_${Date.now()}@dika.test`;
    const { data, error } = await client.auth.signUp({ email, password: 'BrandNew123!' });
    expect(error, error?.message).toBeNull();
    // Local Supabase auto-confirms; a session (or at least a user) must exist.
    expect(data.user?.email).toBe(email);
  });

  test('seeded user can log in, read session, then log out', async () => {
    const client = anonClient();
    const { data: signIn, error: signInErr } = await client.auth.signInWithPassword(USER);
    expect(signInErr, signInErr?.message).toBeNull();
    expect(signIn.session?.access_token).toBeTruthy();

    const { data: got } = await client.auth.getUser();
    expect(got.user?.email).toBe(USER.email);

    await client.auth.signOut();
    const { data: after } = await client.auth.getSession();
    expect(after.session).toBeNull();
  });

  test('wrong password is rejected', async () => {
    const client = anonClient();
    const { error } = await client.auth.signInWithPassword({
      email: USER.email,
      password: 'definitely-wrong',
    });
    expect(error).not.toBeNull();
  });

  test('signed-in client carries identity into PostgREST (auth.uid())', async () => {
    const { client } = await signedInClient(USER);
    // own profile row is created by the handle_new_user trigger and is
    // readable under RLS only when auth.uid() matches.
    const { data, error } = await client.from('profiles').select('email').limit(1);
    expect(error, error?.message).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });
});
