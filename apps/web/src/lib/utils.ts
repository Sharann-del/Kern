import type { ClassValue } from 'clsx';
import { clsx } from 'clsx';
import {
  differenceInHours,
  differenceInMinutes,
  differenceInSeconds,
  format,
  getYear,
  isToday,
  isYesterday,
} from 'date-fns';
import { twMerge } from 'tailwind-merge';

import type { KernField, KernRow } from '@/types/kern';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const seconds = differenceInSeconds(now, d);
  if (seconds < 60) return 'just now';
  const minutes = differenceInMinutes(now, d);
  if (minutes < 60) return `${minutes}m ago`;
  if (isToday(d)) {
    const hours = differenceInHours(now, d);
    return `${Math.max(1, hours)}h ago`;
  }
  if (isYesterday(d)) return 'yesterday';
  if (getYear(d) === getYear(now)) return format(d, 'MMM d');
  return format(d, 'MMM d, yyyy');
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function getPrimaryField(fields: KernField[]): KernField | undefined {
  return fields.find((f) => f.is_primary);
}

function valueToDisplayString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toISOString();
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

export function getDisplayValue(row: KernRow, fields: KernField[]): string {
  const primary = getPrimaryField(fields);
  if (primary) {
    const raw = row.data[primary.slug];
    const s = valueToDisplayString(raw);
    if (s !== '') return s;
  }
  return row.id.slice(0, 8);
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const kb = bytes / 1024;
  if (kb < 1024) {
    if (kb >= 100) return `${Math.round(kb)} KB`;
    const k = Math.round(kb * 10) / 10;
    return Number.isInteger(k) ? `${k} KB` : `${k.toFixed(1)} KB`;
  }
  const mb = kb / 1024;
  if (mb < 1024) {
    if (mb >= 100) return `${Math.round(mb)} MB`;
    const m = Math.round(mb * 10) / 10;
    return Number.isInteger(m) ? `${m} MB` : `${m.toFixed(1)} MB`;
  }
  const gb = mb / 1024;
  if (gb >= 100) return `${Math.round(gb)} GB`;
  const g = Math.round(gb * 10) / 10;
  return Number.isInteger(g) ? `${g} GB` : `${g.toFixed(1)} GB`;
}
