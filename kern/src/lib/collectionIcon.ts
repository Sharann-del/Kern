/** Stored in DB `collections.icon` — emoji string, or `lucide:Table2` style Lucide export name. */
export const COLLECTION_LUCIDE_ICON_PREFIX = 'lucide:' as const;

export function isLucideIconStored(icon: string | null | undefined): icon is string {
  return Boolean(icon?.startsWith(COLLECTION_LUCIDE_ICON_PREFIX));
}

/** Lucide component name (PascalCase), e.g. `Table2`, or null if emoji / empty. */
export function lucideIconNameFromStored(icon: string | null | undefined): string | null {
  if (!icon || !isLucideIconStored(icon)) return null;
  return icon.slice(COLLECTION_LUCIDE_ICON_PREFIX.length) || null;
}

export function formatStoredLucideIcon(name: string): string {
  return `${COLLECTION_LUCIDE_ICON_PREFIX}${name}`;
}
