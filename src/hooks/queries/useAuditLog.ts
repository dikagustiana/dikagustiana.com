import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AuditLogEntry {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  record_title: string | null;
  record_slug: string | null;
  record_section: string | null;
  changes: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditLogFilter {
  search?: string;
  action?: string;
  table?: string;
  userEmail?: string;
  limit?: number;
}

export function useAuditLog(filter: AuditLogFilter = {}) {
  return useQuery({
    queryKey: ['admin-audit-log', filter],
    queryFn: async (): Promise<AuditLogEntry[]> => {
      const client = supabase as unknown as {
        from: (table: string) => {
          select: (cols: string) => {
            order: (col: string, opts: { ascending: boolean }) => {
              limit: (n: number) => Promise<{ data: AuditLogEntry[] | null; error: unknown }>;
            };
          };
        };
      };

      const { data, error } = await client
        .from('admin_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(filter.limit ?? 500);

      if (error) throw error;
      let rows = data ?? [];

      if (filter.action && filter.action !== 'all') {
        rows = rows.filter((r) => r.action === filter.action);
      }
      if (filter.table && filter.table !== 'all') {
        rows = rows.filter((r) => r.table_name === filter.table);
      }
      if (filter.userEmail && filter.userEmail !== 'all') {
        rows = rows.filter((r) => r.user_email === filter.userEmail);
      }
      if (filter.search) {
        const q = filter.search.toLowerCase();
        rows = rows.filter((r) =>
          [r.record_title, r.record_slug, r.user_email, r.table_name]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q))
        );
      }
      return rows;
    },
  });
}
