import { useMemo, useState } from 'react';
import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';
import { useAuditLog, type AuditLogEntry } from '@/hooks/queries/useAuditLog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingState, EmptyState, ErrorState } from '@/components/states';
import { formatDate } from '@/lib/formatDate';

const ACTION_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  create: 'default',
  update: 'secondary',
  delete: 'destructive',
  publish: 'default',
  unpublish: 'outline',
  bulk_publish: 'default',
  bulk_unpublish: 'outline',
};

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return `${formatDate(iso)} · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    return iso;
  }
}

export default function AdminAuditLog() {
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('all');
  const [table, setTable] = useState('all');

  const { data, isLoading, isError, error } = useAuditLog({ search, action, table });

  const rows: AuditLogEntry[] = data ?? [];

  const { actions, tables } = useMemo(() => {
    const a = new Set<string>();
    const t = new Set<string>();
    (data ?? []).forEach((r) => {
      a.add(r.action);
      t.add(r.table_name);
    });
    return { actions: Array.from(a).sort(), tables: Array.from(t).sort() };
  }, [data]);

  return (
    <PageLayout
      variant="dashboard"
      role="manager"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: "Writer's Studio", path: '/admin/dashboard' },
        { label: 'Audit Log' },
      ]}
    >
      <SEO title="Admin Audit Log" description="History of admin edits across content." />
      <div className="container py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Admin Audit Log</h1>
          <p className="text-muted-foreground mt-1">
            Every create, update, delete, and publish action recorded with the admin who made it.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filter</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <Input
              placeholder="Search title, slug, or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger>
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {actions.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={table} onValueChange={setTable}>
              <SelectTrigger>
                <SelectValue placeholder="Table" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tables</SelectItem>
                {tables.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {isLoading ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState message={(error as Error)?.message ?? 'Failed to load audit log.'} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No audit entries"
            message="Once admins edit content, their actions will appear here."
          />
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[160px]">When</TableHead>
                    <TableHead className="w-[180px]">Who</TableHead>
                    <TableHead className="w-[140px]">Action</TableHead>
                    <TableHead>Record</TableHead>
                    <TableHead className="w-[140px]">Table</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatTimestamp(r.created_at)}
                      </TableCell>
                      <TableCell className="text-sm">{r.user_email ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant={ACTION_VARIANTS[r.action] ?? 'secondary'}>
                          {r.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{r.record_title ?? r.record_id ?? '—'}</div>
                        {r.record_slug && (
                          <div className="text-xs text-muted-foreground">{r.record_slug}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.table_name}
                        {r.record_section ? ` · ${r.record_section}` : ''}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </PageLayout>
  );
}
