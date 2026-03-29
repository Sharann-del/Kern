import type { LucideIcon } from 'lucide-react';
import type { ComponentType } from 'react';

export type CommandGroup =
  | 'Navigation'
  | 'Collections'
  | 'Rows'
  | 'Views'
  | 'Filters'
  | 'Sorts'
  | 'Settings';

export type CommandIconProps = { size?: number; className?: string };

export interface CommandDefinition {
  id: string;
  group: CommandGroup;
  label: string;
  icon: LucideIcon | ComponentType<CommandIconProps>;
  shortcut?: string;
  keywords?: string;
  action: () => void;
}
