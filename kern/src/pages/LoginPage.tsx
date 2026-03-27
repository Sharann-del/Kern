import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { OAuthAuthSection } from '@/components/auth/OAuthAuthSection';
import { AuthPageShell } from '@/components/layout/AuthPageShell';
import { getAuthErrorMessage } from '@/lib/authMessages';
import { useAuth } from '@/providers/AuthProvider';
import { INVALID_EMAIL_MESSAGE, isValidEmail } from '@/lib/validation';

const inputClass =
  'w-full rounded-kern-sm border border-kern-border bg-kern-surface-2 px-3 py-2.5 text-sm text-kern-text placeholder:text-kern-text-3 outline-none transition-colors duration-ds-default focus:border-kern-border-2';

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Enter your email.');
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      setError(INVALID_EMAIL_MESSAGE);
      return;
    }
    if (!password) {
      setError('Enter your password.');
      return;
    }
    setLoading(true);
    try {
      await signIn(trimmedEmail, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPageShell
      title="Sign in"
      subtitle="Enter your email and password to continue."
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="font-medium text-kern-text hover:underline">
            Sign up
          </Link>
        </>
      }
    >
      <form className="space-y-4" noValidate onSubmit={handleSignIn}>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-kern-text-2" htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            autoFocus
            inputMode="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            className={inputClass}
          />
        </div>
        <div>
          <label
            className="mb-1.5 block text-sm font-medium text-kern-text-2"
            htmlFor="login-password"
          >
            Password
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            className={inputClass}
          />
        </div>
        {error ? <p className="text-sm text-kern-danger">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-kern-sm border border-transparent bg-kern-accent py-2.5 text-sm font-medium text-kern-on-accent transition-colors duration-ds-fast hover:bg-kern-accent-hover active:brightness-95 disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <div className="mt-8">
        <OAuthAuthSection />
      </div>
    </AuthPageShell>
  );
}
