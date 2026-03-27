import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { OAuthAuthSection } from '@/components/auth/OAuthAuthSection';
import { AuthPageShell } from '@/components/layout/AuthPageShell';
import { getAuthErrorMessage, isEmailAlreadyRegisteredMessage } from '@/lib/authMessages';
import { useAuth } from '@/providers/AuthProvider';
import { INVALID_EMAIL_MESSAGE, isValidEmail } from '@/lib/validation';

const inputClass =
  'w-full rounded-kern-sm border border-kern-border bg-kern-surface-2 px-3 py-2.5 text-sm text-kern-text placeholder:text-kern-text-3 outline-none transition-colors duration-ds-default focus:border-kern-border-2';

export function SignupPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!fullName.trim()) {
      setError('Enter your full name.');
      return;
    }
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
      const { needsEmailConfirmation } = await signUp(trimmedEmail, password, fullName.trim());
      if (needsEmailConfirmation) {
        setSubmittedEmail(trimmedEmail);
        setAwaitingVerification(true);
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (awaitingVerification) {
    return (
      <AuthPageShell
        title="Verify your email"
        subtitle="We sent a confirmation link to finish setting up your account."
        footer={
          <>
            Wrong inbox?{' '}
            <button
              type="button"
              onClick={() => {
                setAwaitingVerification(false);
                setSubmittedEmail('');
              }}
              className="font-medium text-kern-text hover:underline"
            >
              Start over with another email
            </button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-kern-text-2">
          We emailed <span className="text-kern-text">{submittedEmail}</span>. Open the link in that
          message to confirm your address — you&apos;ll be signed in automatically and taken to your
          dashboard.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-kern-text-2">
          If nothing arrives in a few minutes, check your spam or promotions folder.
        </p>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell
      title="Create account"
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-kern-text hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form className="space-y-4" noValidate onSubmit={handleSubmit}>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-kern-text-2" htmlFor="signup-name">
            Full name
          </label>
          <input
            id="signup-name"
            type="text"
            autoComplete="name"
            autoFocus
            placeholder="John Doe"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              setError(null);
            }}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-kern-text-2" htmlFor="signup-email">
            Email
          </label>
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
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
          <label className="mb-1.5 block text-sm font-medium text-kern-text-2" htmlFor="signup-password">
            Password
          </label>
          <input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            placeholder="Choose a password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            className={inputClass}
          />
        </div>
        {error ? (
          <div className="space-y-2">
            <p className="text-sm text-kern-danger">{error}</p>
            {isEmailAlreadyRegisteredMessage(error) ? (
              <p className="text-sm text-kern-text-2">
                <Link to="/login" className="font-medium text-kern-text hover:underline">
                  Go to sign in
                </Link>
              </p>
            ) : null}
          </div>
        ) : null}
        <p className="text-xs leading-relaxed text-kern-text-2">
          By continuing you agree to receive account email from kern (sign-in, security, and product
          updates you can turn off later).
        </p>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-kern-sm border border-transparent bg-kern-accent py-2.5 text-sm font-medium text-kern-on-accent transition-colors duration-ds-fast hover:bg-kern-accent-hover active:brightness-95 disabled:opacity-50"
        >
          {loading ? 'Creating account…' : 'Sign up'}
        </button>
      </form>
      <div className="mt-8">
        <OAuthAuthSection />
      </div>
    </AuthPageShell>
  );
}
