import * as Dialog from '@radix-ui/react-dialog';
import { Command } from 'cmdk';
import { Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { CommandItem } from '@/components/command/CommandItem';
import { Kbd } from '@/components/ui/Kbd';
import { useCommandRegistry } from '@/hooks/useCommandRegistry';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/appStore';
import { useCommandStore } from '@/stores/commandStore';
import type { CommandDefinition, CommandGroup } from '@/types/command';

const COMMAND_GROUP_ORDER: CommandGroup[] = [
  'Navigation',
  'Collections',
  'Rows',
  'Views',
  'Filters',
  'Sorts',
  'Settings',
];

export function CommandPalette() {
  const paletteOpen = useAppStore((s) => s.paletteOpen);
  const closePalette = useAppStore((s) => s.closePalette);
  const addRecentCommand = useCommandStore((s) => s.addRecentCommand);
  const recentCommandIds = useCommandStore((s) => s.recentCommandIds);

  const commands = useCommandRegistry();
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!paletteOpen) return;
    const id = requestAnimationFrame(() => setSearch(''));
    return () => cancelAnimationFrame(id);
  }, [paletteOpen]);

  const commandById = useMemo(() => {
    const m = new Map<string, CommandDefinition>();
    for (const c of commands) m.set(c.id, c);
    return m;
  }, [commands]);

  const recentCommands = useMemo(() => {
    return recentCommandIds.map((id) => commandById.get(id)).filter(Boolean) as CommandDefinition[];
  }, [recentCommandIds, commandById]);

  const recentIds = useMemo(() => new Set(recentCommandIds), [recentCommandIds]);

  const handleSelect = useCallback(
    (command: CommandDefinition) => {
      closePalette();
      command.action();
      addRecentCommand(command.id);
    },
    [closePalette, addRecentCommand]
  );

  const onOpenChange = useCallback(
    (open: boolean) => {
      if (!open) closePalette();
    },
    [closePalette]
  );

  const showRecent = !search.trim() && recentCommands.length > 0;

  return (
    <Dialog.Root open={paletteOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[200] bg-black/40 animate-kern-fade-in" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-[20%] z-[201] w-full max-w-[620px] -translate-x-1/2',
            'overflow-hidden rounded-kern-xl border border-kern-border bg-kern-bg shadow-2xl',
            'animate-kern-dialog-in outline-none'
          )}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <Dialog.Title className="sr-only">Command palette</Dialog.Title>
          <Dialog.Description className="sr-only">Search commands and navigate Kern</Dialog.Description>

          <Command loop shouldFilter label="Command palette" className="text-kern-text">
            <div className="flex h-11 items-center gap-2 border-b border-kern-border px-3">
              <Search size={16} className="flex-shrink-0 text-kern-text-3" aria-hidden />
              <Command.Input
                placeholder="Search anything..."
                value={search}
                onValueChange={setSearch}
                className="flex-1 bg-transparent text-sm text-kern-text outline-none placeholder:text-kern-text-3"
              />
              <Kbd>Esc</Kbd>
            </div>

            <Command.List className="max-h-[380px] overflow-y-auto p-1">
              <Command.Empty className="py-8 text-center text-sm text-kern-text-2">
                No results for this search
              </Command.Empty>

              {showRecent ? (
                <Command.Group
                  heading="Recent"
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-kern-text-3"
                >
                  {recentCommands.map((cmd) => (
                    <CommandItem key={cmd.id} command={cmd} onSelect={handleSelect} />
                  ))}
                </Command.Group>
              ) : null}

              {COMMAND_GROUP_ORDER.map((group) => {
                const groupCommands = commands.filter(
                  (c) => c.group === group && (!recentIds.has(c.id) || Boolean(search.trim()))
                );
                if (groupCommands.length === 0) return null;
                return (
                  <Command.Group
                    key={group}
                    heading={group}
                    className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-kern-text-3"
                  >
                    {groupCommands.map((cmd) => (
                      <CommandItem key={cmd.id} command={cmd} onSelect={handleSelect} />
                    ))}
                  </Command.Group>
                );
              })}
            </Command.List>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
