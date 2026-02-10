import { PageLayout } from '@/components/layouts/PageLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';

export default function Settings() {
  const { user } = useAuth();

  return (
    <PageLayout
      variant="content"
      role="hybrid"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'Settings' }
      ]}
    >
      <main className="flex-1 container py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-display font-bold mb-8">Settings</h1>

          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>Manage your account settings and preferences.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input value={user?.email || ''} disabled />
              </div>
              <div>
                <Label>Display Name</Label>
                <Input placeholder="Enter your display name" />
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </PageLayout>
  );
}
