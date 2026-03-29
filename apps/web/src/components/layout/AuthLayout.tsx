import { Outlet, useLocation } from 'react-router-dom';

import {
  AnimatePresence,
  authBackgroundBreath,
  authCardEntrance,
  authLoginFormVariants,
  authLogoEntrance,
  authLogoGlowLoop,
  authPageShell,
  authSignupFormVariants,
  motion,
  shouldAnimate,
} from '@/lib/animations';

export function AuthLayout() {
  const location = useLocation();
  const isSignup = location.pathname.endsWith('/signup');

  return (
    <motion.div
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={authPageShell}
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-kern-bg via-kern-surface/80 to-kern-bg"
        animate={shouldAnimate ? { opacity: [0.78, 0.9, 0.78] } : { opacity: 0.85 }}
        transition={authBackgroundBreath}
      />

      <div className="relative z-10 flex w-full max-w-[400px] flex-col items-center">
        <div className="relative mb-6">
          <motion.p
            className="kern-display relative z-10 text-center text-5xl leading-none tracking-tight text-kern-text sm:text-6xl"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={authLogoEntrance}
          >
            kern
          </motion.p>
          <motion.div
            aria-hidden
            className="absolute left-1/2 top-1/2 -z-0 h-24 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full bg-kern-accent/25 blur-3xl"
            initial={{ opacity: 0 }}
            animate={shouldAnimate ? { opacity: [0.12, 0.32, 0.12] } : { opacity: 0.15 }}
            transition={authLogoGlowLoop}
          />
        </div>

        <motion.div
          className="w-full rounded-ds-md border border-kern-border bg-kern-surface p-8 shadow-ds-sm"
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={authCardEntrance}
        >
          {/* Stack routes in one grid cell so `mode="sync"` crossfades without a full-opacity gap (wait = blink). */}
          <div className="grid grid-cols-1 grid-rows-1 place-items-stretch [&>*]:col-start-1 [&>*]:row-start-1 [&>*]:min-w-0">
            <AnimatePresence initial={false} mode="sync">
              <motion.div
                key={isSignup ? 'signup' : 'login'}
                variants={isSignup ? authSignupFormVariants : authLoginFormVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="min-w-0 self-start"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
