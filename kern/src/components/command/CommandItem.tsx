import { Command } from 'cmdk';
import { motion } from 'framer-motion';
import { forwardRef } from 'react';

import { Kbd } from '@/components/ui/Kbd';
import { motionTransitionCustom, shouldAnimate, TRANSITIONS } from '@/lib/animations';
import { cn } from '@/lib/utils';
import type { CommandDefinition } from '@/types/command';

export type CommandItemProps = {
  command: CommandDefinition;
  onSelect: (cmd: CommandDefinition) => void;
  /** Delay when the palette list remounts (stagger). */
  staggerDelaySec?: number;
};

export const CommandItem = forwardRef<HTMLDivElement, CommandItemProps>(function CommandItem(
  { command, onSelect, staggerDelaySec = 0 },
  ref
) {
  const Icon = command.icon;
  const delay = shouldAnimate ? staggerDelaySec : 0;
  return (
    <Command.Item
      ref={ref}
      value={`${command.label} ${command.keywords ?? ''}`}
      onSelect={() => onSelect(command)}
      className={cn(
        'flex cursor-pointer items-center gap-2.5 rounded-kern-sm px-3 py-2 text-sm text-kern-text',
        '[&_svg]:text-kern-text-3 data-[selected=true]:[&_svg]:text-kern-accent',
        'data-[selected=true]:bg-kern-accent/10 data-[selected=true]:text-kern-accent',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50'
      )}
    >
      <motion.div
        className="flex min-w-0 flex-1 items-center gap-2.5"
        initial={shouldAnimate ? { opacity: 0, y: 4 } : false}
        animate={{
          opacity: 1,
          y: 0,
          transition: motionTransitionCustom({ ...TRANSITIONS.enter, delay }),
        }}
      >
        <Icon size={15} className="shrink-0" />
        <span className="flex-1 truncate">{command.label}</span>
        {command.shortcut ? <Kbd className="shrink-0">{command.shortcut}</Kbd> : null}
      </motion.div>
    </Command.Item>
  );
});
