import { Command } from 'cmdk';
import { forwardRef } from 'react';

import { Kbd } from '@/components/ui/Kbd';
import { cn } from '@/lib/utils';
import type { CommandDefinition } from '@/types/command';

export type CommandItemProps = {
  command: CommandDefinition;
  onSelect: (cmd: CommandDefinition) => void;
};

export const CommandItem = forwardRef<HTMLDivElement, CommandItemProps>(function CommandItem(
  { command, onSelect },
  ref
) {
  const Icon = command.icon;
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
      <Icon size={15} className="shrink-0" />
      <span className="flex-1 truncate">{command.label}</span>
      {command.shortcut ? <Kbd className="shrink-0">{command.shortcut}</Kbd> : null}
    </Command.Item>
  );
});
