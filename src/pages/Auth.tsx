import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/Layout';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = isLogin 
      ? await signIn(email, password)
      : await signUp(email, password);

    if (error) {
      const message = /failed to fetch/i.test(error.message)
        ? 'Network error: cannot reach the server. Please check your connection (or disable any blocker) and try again.'
        : error.message;
      toast({ title: message, variant: 'destructive' });
    } else {
      toast({ title: isLogin ? 'Welcome back!' : 'Account created!' });
      navigate('/');
    }
    setLoading(false);
  };

  return (
    <Layout>
      <SEO title={isLogin ? 'Sign In' : 'Create Account'} description="Sign in or create an account to access Dika Gustiana's studio." noindex />
      <div className="min-h-[80vh] flex items-center justify-center py-12">
        <div className="w-full max-w-md p-8 bg-card rounded-xl border border-border">
          <h1 className="text-2xl font-display font-bold text-center mb-6">
            {isLogin ? 'Sign In' : 'Create Account'}
          </h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Loading...' : isLogin ? 'Sign In' : 'Sign Up'}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-4">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-accent hover:underline"
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </Layout>
  );
}
