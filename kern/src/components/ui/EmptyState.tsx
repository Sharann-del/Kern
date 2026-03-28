import { motion } from 'framer-motion';
import type { ComponentType } from 'react';

import { Button } from '@/components/ui/Button';
import { VARIANTS } from '@/lib/animations';

type IconProps = { size?: number; className?: string };

export type EmptyStateProps = {
  icon: ComponentType<IconProps>;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({
  icon: Icon,
  title,
  subtitle,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center gap-3 px-8 py-16 text-center"
      variants={VARIANTS.emptyFadeUp}
      initial="hidden"
      animate="visible"
    >
      <Icon size={40} className="text-kern-text-3" aria-hidden />
      <p className="text-sm font-medium text-kern-text">{title}</p>
      {subtitle ? <p className="text-sm text-kern-text-2">{subtitle}</p> : null}
      {actionLabel && onAction ? (
        <Button variant="secondary" size="sm" type="button" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </motion.div>
  );
}
