import * as Dialog from '@radix-ui/react-dialog';
import { Command } from 'cmdk';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { CommandItem } from '@/components/command/CommandItem';
import { Kbd } from '@/components/ui/Kbd';
import { useCommandRegistry } from '@/hooks/useCommandRegistry';
import { VARIANTS } from '@/lib/animations';

const STAGGER_ITEM_SEC = 0.025;
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
  const [listStaggerKey, setListStaggerKey] = useState(0);

  useEffect(() => {
    if (!paletteOpen) return;
    setListStaggerKey((k) => k + 1);
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
        <Dialog.Overlay forceMount asChild>
          <motion.div
            className={cn(
              'fixed inset-0 z-[200] bg-black/40',
              !paletteOpen && 'pointer-events-none'
            )}
            variants={VARIANTS.paletteOverlayFade}
            initial="hidden"
            animate={paletteOpen ? 'visible' : 'hidden'}
          />
        </Dialog.Overlay>
        <Dialog.Content
          forceMount
          asChild
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <div
            className={cn(
              'fixed inset-0 z-[201] flex justify-center overflow-y-auto px-4 pt-[20vh] pb-8 outline-none',
              !paletteOpen && 'pointer-events-none'
            )}
          >
            <motion.div
              className={cn(
                'relative h-fit w-full max-w-[620px]',
                'overflow-hidden rounded-kern-xl border border-kern-border bg-kern-bg shadow-2xl outline-none',
                !paletteOpen && 'pointer-events-none'
              )}
              variants={VARIANTS.commandScaleIn}
              initial="hidden"
              animate={paletteOpen ? 'visible' : 'hidden'}
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

              <Command.List key={listStaggerKey} className="max-h-[380px] overflow-y-auto p-1">
                <Command.Empty className="py-8 text-center text-sm text-kern-text-2">
                  No results for this search
                </Command.Empty>

                {(() => {
                  let staggerIndex = 0;
                  return (
                    <>
                      {showRecent ? (
                        <Command.Group
                          heading="Recent"
                          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-kern-text-3"
                        >
                          {recentCommands.map((cmd) => (
                            <CommandItem
                              key={cmd.id}
                              command={cmd}
                              onSelect={handleSelect}
                              staggerDelaySec={staggerIndex++ * STAGGER_ITEM_SEC}
                            />
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
                              <CommandItem
                                key={cmd.id}
                                command={cmd}
                                onSelect={handleSelect}
                                staggerDelaySec={staggerIndex++ * STAGGER_ITEM_SEC}
                              />
                            ))}
                          </Command.Group>
                        );
                      })}
                    </>
                  );
                })()}
              </Command.List>
            </Command>
            </motion.div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
