import { supabase } from '@/integrations/supabase/client';

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'archive'
  | 'restore'
  | 'publish'
  | 'unpublish'
  | 'bulk_publish'
  | 'bulk_unpublish';

export interface AuditLogInput {
  action: AuditAction;
  table_name: string;
  record_id?: string | null;
  record_title?: string | null;
  record_slug?: string | null;
  record_section?: string | null;
  changes?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Records an admin action to the audit log. Best-effort: failures are logged
 * to the console (dev) but never throw, so they don't break the underlying
 * mutation.
 */
export async function logAuditEvent(input: AuditLogInput): Promise<void> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) return; // Silently skip when not signed in.

    // Cast through unknown because the generated types may not yet include
    // admin_audit_log until the type-gen pass completes.
    const client = supabase as unknown as {
      from: (table: string) => {
        insert: (row: Record<string, unknown>) => Promise<{ error: unknown }>;
      };
    };

    const { error } = await client.from('admin_audit_log').insert({
      user_id: user.id,
      user_email: user.email ?? null,
      action: input.action,
      table_name: input.table_name,
      record_id: input.record_id ?? null,
      record_title: input.record_title ?? null,
      record_slug: input.record_slug ?? null,
      record_section: input.record_section ?? null,
      changes: input.changes ?? null,
      metadata: input.metadata ?? null,
    });

    if (error && import.meta.env.DEV) {
      console.warn('[auditLog] failed to record event', error);
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[auditLog] unexpected failure', err);
    }
  }
}
