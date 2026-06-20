import { test, expect } from '@playwright/test';
import { signedInClient, ADMIN, USER, LIVE } from './helpers';

/**
 * Role gating against real RLS: the admin fixture has role 'admin' in
 * user_roles; the ordinary user does not. Admin-only writes (essays) must
 * succeed for admin and be rejected for the ordinary user.
 * Gated by E2E_LIVE=1.
 */
test.describe('live: admin role gating', () => {
  test.skip(!LIVE, 'live suite disabled (set E2E_LIVE=1 + SUPABASE_* env)');

  test('admin user resolves role=admin via user_roles', async () => {
    const { client, session } = await signedInClient(ADMIN);
    const { data, error } = await client
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .eq('role', 'admin')
      .maybeSingle();
    expect(error, error?.message).toBeNull();
    expect(data?.role).toBe('admin');
  });

  test('ordinary user has no admin role', async () => {
    const { client, session } = await signedInClient(USER);
    const { data } = await client
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .eq('role', 'admin')
      .maybeSingle();
    expect(data).toBeNull();
  });

  test('only admin can insert an essay (RLS write gate)', async () => {
    const slug = `gating-${Date.now()}`;

    // Ordinary user: blocked by RLS.
    const { client: userClient } = await signedInClient(USER);
    const denied = await userClient
      .from('essays')
      .insert({ section: 'next-big-thing', slug: `${slug}-u`, title: 'nope', published: false })
      .select('id');
    expect(denied.error, 'ordinary user should be blocked').not.toBeNull();

    // Admin: allowed.
    const { client: adminClient } = await signedInClient(ADMIN);
    const allowed = await adminClient
      .from('essays')
      .insert({ section: 'next-big-thing', slug: `${slug}-a`, title: 'admin essay', published: false })
      .select('id')
      .single();
    expect(allowed.error, allowed.error?.message).toBeNull();
    expect(allowed.data?.id).toBeTruthy();

    // Cleanup.
    if (allowed.data?.id) {
      await adminClient.from('essays').delete().eq('id', allowed.data.id);
    }
  });
});
