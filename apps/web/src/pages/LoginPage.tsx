import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { OAuthAuthSection } from '@/components/auth/OAuthAuthSection';
import {
  AnimatePresence,
  authGoldFlash,
  authInputShake,
  authPrimarySpinner,
  authSuccessPop,
  motion,
  shouldAnimate,
  staggerContainer,
  staggerItem,
} from '@/lib/animations';
import { getAuthErrorMessage } from '@/lib/authMessages';
import { INVALID_EMAIL_MESSAGE, isValidEmail } from '@/lib/validation';
import { useAuth } from '@/providers/AuthProvider';
import { Check, Loader2 } from 'lucide-react';

const MotionLink = motion(Link);

const inputClass =
  'auth-page-input w-full rounded-kern-sm border border-kern-border bg-kern-surface-2 px-3 py-2.5 text-sm text-kern-text placeholder:text-kern-text-3 outline-none transition-colors duration-ds-default focus:border-kern-border-2';

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const successNavigateRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (successNavigateRef.current) clearTimeout(successNavigateRef.current);
    };
  }, []);

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
      setLoading(false);
      setSuccess(true);
      const delay = shouldAnimate ? 420 : 0;
      successNavigateRef.current = setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, delay);
    } catch (err) {
      setError(getAuthErrorMessage(err));
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight text-kern-text">Sign in</h1>
      <p className="mt-1.5 text-sm leading-relaxed text-kern-text-2">
        Enter your email and password to continue.
      </p>
      <div className="relative mt-8 text-left">
        <motion.form
          className="space-y-4"
          noValidate
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          onSubmit={(e) => void handleSignIn(e)}
        >
          <motion.div variants={staggerItem}>
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
          </motion.div>
          <motion.div variants={staggerItem}>
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
          </motion.div>
          {error ? (
            <motion.p
              key={error}
              className="text-sm text-kern-danger"
              initial={{ x: 0 }}
              animate={{ x: [0, -8, 8, -6, 6, 0] }}
              transition={authInputShake}
            >
              {error}
            </motion.p>
          ) : null}
          <motion.div variants={staggerItem}>
            <motion.button
              type="submit"
              disabled={loading || success}
              whileTap={shouldAnimate && !loading ? { scale: 0.985 } : undefined}
              className="relative flex min-h-[42px] w-full items-center justify-center overflow-hidden rounded-kern-sm border border-transparent bg-kern-accent py-2.5 text-sm font-medium text-kern-on-accent transition-[filter] duration-ds-fast hover:bg-kern-accent-hover hover:brightness-[1.06] active:brightness-95 disabled:opacity-50"
            >
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.span
                    key="loading"
                    className="flex items-center justify-center gap-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <motion.span
                      className="flex items-center"
                      animate={{ rotate: 360 }}
                      transition={authPrimarySpinner}
                    >
                      <Loader2 className="h-4 w-4 shrink-0" aria-hidden />
                    </motion.span>
                    Signing in…
                  </motion.span>
                ) : (
                  <motion.span
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    Sign in
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </motion.div>
        </motion.form>

        <div className="mt-8">
          <OAuthAuthSection />
        </div>

        <AnimatePresence>
          {success ? (
            <motion.div
              className="absolute inset-0 z-20 flex items-center justify-center rounded-ds-md bg-kern-bg/55 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={authGoldFlash}
            >
              <motion.div
                initial={{ scale: 0.75, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={authSuccessPop}
                className="flex h-14 w-14 items-center justify-center rounded-full border border-kern-accent/40 bg-kern-surface-2 shadow-ds-sm"
              >
                <Check className="h-7 w-7 text-kern-accent" aria-hidden />
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="mt-10 border-t border-kern-border pt-6 text-center text-sm text-kern-text-2">
        Don&apos;t have an account?{' '}
        <MotionLink
          to="/signup"
          className="font-medium text-kern-text transition-colors duration-ds-fast hover:text-kern-accent hover:underline"
          whileTap={shouldAnimate ? { scale: 0.98 } : undefined}
        >
          Sign up
        </MotionLink>
      </div>
    </>
  );
}
