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
      // Filters run SERVER-SIDE: the client-side pass filtered only the
      // fetched page (limit 500), so a search silently missed every matching
      // row beyond it.
      let query = supabase
        .from('admin_audit_log')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter.action && filter.action !== 'all') {
        query = query.eq('action', filter.action);
      }
      if (filter.table && filter.table !== 'all') {
        query = query.eq('table_name', filter.table);
      }
      if (filter.userEmail && filter.userEmail !== 'all') {
        query = query.eq('user_email', filter.userEmail);
      }
      if (filter.search) {
        const q = filter.search.replace(/[%,]/g, '');
        if (q) {
          query = query.or(
            `record_title.ilike.%${q}%,record_slug.ilike.%${q}%,user_email.ilike.%${q}%`
          );
        }
      }

      const { data, error } = await query.limit(filter.limit ?? 500);
      if (error) throw error;
      // changes/metadata are jsonb (Database types them Json); the entry
      // type models them as records.
      return (data ?? []) as unknown as AuditLogEntry[];
    },
  });
}
