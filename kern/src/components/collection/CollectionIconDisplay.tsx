import { Folder } from 'lucide-react';

import { LUCIDE_ICONS_BY_NAME } from '@/components/collection/collectionLucideIcons';
import { lucideIconNameFromStored } from '@/lib/collectionIcon';
import { cn } from '@/lib/utils';

export type CollectionIconDisplayProps = {
  icon: string | null;
  /** Used when icon is empty (color swatch) or to tint Lucide glyph */
  color?: string | null;
  /** Emoji font size (px); Lucide uses this as `size`. */
  size?: number;
  className?: string;
};

/**
 * Renders a collection visual: Lucide icon (`lucide:Name` in DB), emoji, color fallback, or default folder.
 */
export function CollectionIconDisplay({
  icon,
  color,
  size = 20,
  className,
}: CollectionIconDisplayProps) {
  const lucideName = lucideIconNameFromStored(icon);
  if (lucideName) {
    const Icon = LUCIDE_ICONS_BY_NAME[lucideName] ?? Folder;
    return (
      <Icon
        size={size}
        className={cn('shrink-0', !color && 'text-kern-text-3', className)}
        style={color ? { color } : undefined}
        aria-hidden
      />
    );
  }

  if (icon) {
    return (
      <span
        className={cn('inline-flex shrink-0 items-center justify-center leading-none', className)}
        style={{ fontSize: size }}
        aria-hidden
      >
        {icon}
      </span>
    );
  }

  if (color) {
    return (
      <span
        className={cn('shrink-0 rounded-kern-sm border border-kern-border', className)}
        style={{
          width: size,
          height: size,
          minWidth: size,
          minHeight: size,
          backgroundColor: color,
        }}
        aria-hidden
      />
    );
  }

  return <Folder size={size} className={cn('shrink-0 text-kern-text-3', className)} aria-hidden />;
}
