import {
  AlignLeft,
  ArrowLeftRight,
  Calendar,
  CalendarClock,
  CheckSquare2,
  ChevronDown,
  Hash,
  Link,
  ListChecks,
  Mail,
  Paperclip,
  Phone,
  Type,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import type { FieldType } from '@/types/kern';

const ICONS: Record<FieldType, LucideIcon> = {
  text: Type,
  rich_text: AlignLeft,
  number: Hash,
  date: Calendar,
  datetime: CalendarClock,
  boolean: CheckSquare2,
  select: ChevronDown,
  multi_select: ListChecks,
  url: Link,
  email: Mail,
  phone: Phone,
  relation: ArrowLeftRight,
  file: Paperclip,
};

export type FieldTypeIconProps = {
  type: FieldType;
  size?: number;
  className?: string;
};

export function FieldTypeIcon({ type, size = 14, className }: FieldTypeIconProps) {
  const Icon = ICONS[type];
  return <Icon size={size} className={cn('shrink-0', className)} aria-hidden />;
}
