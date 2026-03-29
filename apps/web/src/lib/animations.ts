import type { Transition, Variants } from 'framer-motion';

/** Ease-out for entrances (SaaS-style). */
const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];
/** Ease-in for exits. */
const EASE_IN: [number, number, number, number] = [0.55, 0, 1, 0.45];

export const shouldAnimate =
  typeof window !== 'undefined' &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const TRANSITIONS = {
  fast: { duration: 0.08, ease: EASE_OUT },
  default: { duration: 0.15, ease: EASE_OUT },
  enter: { duration: 0.2, ease: EASE_OUT },
  page: { duration: 0.3, ease: EASE_OUT },
  /** Command palette overlay */
  paletteOverlay: { duration: 0.12, ease: EASE_OUT },
  /** Dropdown / popover content */
  menu: { duration: 0.12, ease: EASE_OUT },
  /** Empty states */
  empty: { duration: 0.25, ease: EASE_OUT },
  /** Auth success check / pop */
  snappy: { duration: 0.2, ease: EASE_OUT },
} as const satisfies Record<string, Transition>;

export type MotionTransitionName = keyof typeof TRANSITIONS;

export function motionTransition(name: MotionTransitionName): Transition {
  if (!shouldAnimate) return { duration: 0 };
  return TRANSITIONS[name];
}

/** Custom transition (e.g. one-off durations) respecting reduced motion. */
export function motionTransitionCustom(t: Transition): Transition {
  if (!shouldAnimate) return { duration: 0 };
  return t;
}

const enterTrans = (duration: number) =>
  shouldAnimate ? { duration, ease: EASE_OUT } : { duration: 0 };
const exitTrans = (duration: number) =>
  shouldAnimate ? { duration, ease: EASE_IN } : { duration: 0 };

export const VARIANTS = {
  fadeUp: {
    hidden: { opacity: 0, y: 6 },
    visible: {
      opacity: 1,
      y: 0,
      transition: enterTrans(0.2),
    },
    exit: {
      opacity: 0,
      y: 4,
      transition: exitTrans(0.15),
    },
  },
  fade: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: enterTrans(0.15),
    },
    exit: {
      opacity: 0,
      transition: exitTrans(0.12),
    },
  },
  /** App shell route outlet — enter 0.2s */
  pageFade: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: enterTrans(0.2),
    },
    exit: {
      opacity: 0,
      transition: exitTrans(0.15),
    },
  },
  /** EmptyState — 0.25s fade-up */
  emptyFadeUp: {
    hidden: { opacity: 0, y: 6 },
    visible: {
      opacity: 1,
      y: 0,
      transition: enterTrans(0.25),
    },
    exit: {
      opacity: 0,
      y: 4,
      transition: exitTrans(0.18),
    },
  },
  scaleIn: {
    hidden: { opacity: 0, scale: 0.96, y: -4 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: enterTrans(0.12),
    },
    exit: {
      opacity: 0,
      scale: 0.98,
      y: -2,
      transition: exitTrans(0.1),
    },
  },
  /** Command palette dialog — enter 0.15s */
  commandScaleIn: {
    hidden: { opacity: 0, scale: 0.96, y: -4 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: enterTrans(0.15),
    },
    exit: {
      opacity: 0,
      scale: 0.98,
      y: -2,
      transition: exitTrans(0.12),
    },
  },
  /** Command palette overlay — 0.12s */
  paletteOverlayFade: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: enterTrans(0.12),
    },
    exit: {
      opacity: 0,
      transition: exitTrans(0.1),
    },
  },
  slideRight: {
    hidden: { opacity: 0, x: 16 },
    visible: {
      opacity: 1,
      x: 0,
      transition: enterTrans(0.2),
    },
    exit: {
      opacity: 0,
      x: 16,
      transition: exitTrans(0.18),
    },
  },
  slideLeft: {
    hidden: { opacity: 0, x: -8 },
    visible: {
      opacity: 1,
      x: 0,
      transition: enterTrans(0.2),
    },
  },
  stagger: {
    hidden: {},
    visible: {
      transition: { staggerChildren: shouldAnimate ? 0.035 : 0 },
    },
  },
  staggerChild: {
    hidden: { opacity: 0, y: 5 },
    visible: {
      opacity: 1,
      y: 0,
      transition: shouldAnimate
        ? { duration: 0.2, ease: EASE_OUT }
        : { duration: 0 },
    },
  },
  /** Sidebar sortable rows — opacity only (dnd-kit owns transforms on the outer node). */
  sidebarStaggerChild: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: shouldAnimate
        ? { duration: 0.18, ease: EASE_OUT }
        : { duration: 0 },
    },
  },
  dashboardStagger: {
    hidden: {},
    visible: {
      transition: { staggerChildren: shouldAnimate ? 0.04 : 0 },
    },
  },
  dashboardStaggerChild: {
    hidden: { opacity: 0, y: 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: shouldAnimate
        ? { duration: 0.2, ease: EASE_OUT }
        : { duration: 0 },
    },
  },
  kanbanColumnsStagger: {
    hidden: {},
    visible: {
      transition: { staggerChildren: shouldAnimate ? 0.05 : 0 },
    },
  },
  kanbanColumnStaggerChild: {
    hidden: { opacity: 0, x: 8 },
    visible: {
      opacity: 1,
      x: 0,
      transition: shouldAnimate
        ? { duration: 0.22, ease: EASE_OUT }
        : { duration: 0 },
    },
  },
} as const satisfies Record<string, Variants>;

export const staggerContainer = VARIANTS.stagger;
export const staggerItem = VARIANTS.staggerChild;

/** Kit-style aliases */
export const E = { out: EASE_OUT, in: EASE_IN } as const;
export const T = TRANSITIONS;
export const prefersReducedMotion = !shouldAnimate;

export { AnimatePresence, motion } from 'framer-motion';

// ─── Auth (login / signup) ───

export const authPageShell: Transition = motionTransitionCustom({ ...TRANSITIONS.default });

export const authLogoEntrance: Transition = motionTransitionCustom({
  duration: prefersReducedMotion ? 0 : 0.6,
  ease: E.out,
});

export const authLogoGlowLoop: Transition = prefersReducedMotion
  ? { duration: 0 }
  : { duration: 5.5, repeat: Infinity, ease: 'easeInOut' };

export const authCardEntrance: Transition = motionTransitionCustom({
  duration: prefersReducedMotion ? 0 : 0.55,
  ease: E.out,
});

/** Login ↔ signup — symmetric crossfade (use with AnimatePresence `mode="sync"` + stacked grid; avoids wait-mode “blink”). */
const AUTH_ROUTE_CROSSFADE_EASE: [number, number, number, number] = [0.33, 0, 0.2, 1];

export const authRouteCrossfadeEnter: Transition = motionTransitionCustom({
  duration: 0.52,
  ease: AUTH_ROUTE_CROSSFADE_EASE,
});

export const authRouteCrossfadeExit: Transition = motionTransitionCustom({
  duration: 0.52,
  ease: AUTH_ROUTE_CROSSFADE_EASE,
});

export const authLoginFormVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: authRouteCrossfadeEnter },
  exit: { opacity: 0, transition: authRouteCrossfadeExit },
};

export const authSignupFormVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: authRouteCrossfadeEnter },
  exit: { opacity: 0, transition: authRouteCrossfadeExit },
};

export const authSignupInnerFormVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: motionTransition('default') },
  exit: { opacity: 0, transition: motionTransition('fast') },
};

export const authSignupInnerVerifyVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: motionTransition('default') },
  exit: { opacity: 0, transition: motionTransition('fast') },
};

export const authDividerExpand: Transition = motionTransitionCustom({
  duration: prefersReducedMotion ? 0 : 0.6,
  ease: E.out,
});

export const authOrLabelReveal: Transition = motionTransitionCustom({
  ...TRANSITIONS.fast,
  delay: prefersReducedMotion ? 0 : 0.15,
});

export const authPrimarySpinner: Transition = prefersReducedMotion
  ? { duration: 0 }
  : { duration: 0.8, repeat: Infinity, ease: 'linear' };

export const authBackgroundBreath: Transition = prefersReducedMotion
  ? { duration: 0 }
  : { duration: 6, repeat: Infinity, ease: 'easeInOut' };

export const authSuccessPop: Transition = motionTransitionCustom({ ...TRANSITIONS.snappy });

export const authGoldFlash: Transition = motionTransitionCustom({
  duration: prefersReducedMotion ? 0 : 0.5,
});

export const authInputShake: Transition = motionTransitionCustom({
  duration: prefersReducedMotion ? 0 : 0.3,
});
