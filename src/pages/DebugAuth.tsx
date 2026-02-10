import { PageLayout } from '@/components/layouts/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

export default function DebugAuth() {
  const { user, session, isAdmin, isLoading } = useAuth();

  return (
    <PageLayout
      variant="content"
      role="hybrid"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Debug', path: '/debug/auth' },
        { label: 'Auth' }
      ]}
    >
      <main className="flex-1 container py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-display font-bold mb-8">Auth Debug</h1>

          <Card>
            <CardHeader>
              <CardTitle>Authentication State</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-secondary p-4 rounded-lg overflow-auto text-sm">
                {JSON.stringify({
                  isLoading,
                  isAdmin,
                  user: user ? {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                  } : null,
                  session: session ? {
                    expires_at: session.expires_at,
                  } : null,
                }, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>
      </main>
    </PageLayout>
  );
}
