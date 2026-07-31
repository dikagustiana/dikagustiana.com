import { test, expect } from '@playwright/test';
import { signedInClient, USER, LIVE } from './helpers';

/**
 * Real CRUD against the Personal Finance tables, under RLS (a user may only
 * touch rows where auth.uid() = user_id). Proves create/read/update/delete
 * actually persist. Gated by E2E_LIVE=1.
 */
test.describe('live: Personal Finance CRUD', () => {
  test.skip(!LIVE, 'live suite disabled (set E2E_LIVE=1 + SUPABASE_* env)');

  test('account + transaction full CRUD lifecycle', async () => {
    const { client, session } = await signedInClient(USER);
    const uid = session.user.id;

    // CREATE account
    const created = await client
      .from('finance_accounts')
      .insert({ user_id: uid, name: 'E2E Checking', account_type: 'checking', balance: 1000, currency: 'IDR' })
      .select('*')
      .single();
    expect(created.error, created.error?.message).toBeNull();
    const accountId = created.data!.id;

    // READ back
    const read = await client.from('finance_accounts').select('*').eq('id', accountId).single();
    expect(read.data!.name).toBe('E2E Checking');
    expect(Number(read.data!.balance)).toBe(1000);

    // UPDATE
    const updated = await client
      .from('finance_accounts')
      .update({ balance: 2500 })
      .eq('id', accountId)
      .select('balance')
      .single();
    expect(Number(updated.data!.balance)).toBe(2500);

    // CREATE transaction referencing the account
    const txn = await client
      .from('finance_transactions')
      .insert({
        user_id: uid,
        account_id: accountId,
        transaction_type: 'expense',
        amount: 42.5,
        description: 'E2E coffee',
        date: '2026-01-01',
      })
      .select('*')
      .single();
    expect(txn.error, txn.error?.message).toBeNull();
    const txnId = txn.data!.id;
    expect(Number(txn.data!.amount)).toBe(42.5);

    // UPDATE transaction
    const txnUpd = await client
      .from('finance_transactions')
      .update({ description: 'E2E coffee (edited)' })
      .eq('id', txnId)
      .select('description')
      .single();
    expect(txnUpd.data!.description).toBe('E2E coffee (edited)');

    // DELETE transaction, then account
    const delTxn = await client.from('finance_transactions').delete().eq('id', txnId);
    expect(delTxn.error).toBeNull();
    const delAcc = await client.from('finance_accounts').delete().eq('id', accountId);
    expect(delAcc.error).toBeNull();

    // Confirm gone
    const gone = await client.from('finance_accounts').select('id').eq('id', accountId);
    expect(gone.data).toEqual([]);
  });
});
