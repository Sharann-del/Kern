import { ArrowDown, ArrowUp, MoreHorizontal } from 'lucide-react';
import { useState } from 'react';

import { FieldTypeIcon } from '@/components/field/FieldTypeIcon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { KernField } from '@/types/kern';

export type TableColumnHeaderProps = {
  field: KernField;
  isSorted: false | 'asc' | 'desc';
  onSort: () => void;
  width: number;
  onResizeStart: (e: React.MouseEvent) => void;
  onEdit: () => void;
  onHide: () => void;
  onDelete: () => void;
  onAddFieldBefore: () => void;
  onAddFieldAfter: () => void;
};

export function TableColumnHeader({
  field,
  isSorted,
  onSort,
  width: _width,
  onResizeStart,
  onEdit,
  onHide,
  onDelete,
  onAddFieldBefore,
  onAddFieldAfter,
}: TableColumnHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className="group/header relative flex h-full shrink-0 items-center border-r border-kern-border bg-kern-bg"
      style={{ width: _width, minWidth: _width, maxWidth: _width }}
    >
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-1.5 px-2 py-0 text-left"
        onClick={(e) => {
          e.stopPropagation();
          if (!menuOpen) onSort();
        }}
      >
        <FieldTypeIcon type={field.type} size={12} className="shrink-0 text-kern-text-2" />
        <span className="min-w-0 truncate text-xs font-medium text-kern-text-2">{field.name}</span>
        {isSorted === 'asc' ? (
          <ArrowUp size={12} className="shrink-0 text-kern-accent" aria-hidden />
        ) : isSorted === 'desc' ? (
          <ArrowDown size={12} className="shrink-0 text-kern-accent" aria-hidden />
        ) : null}
      </button>

      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              'h-7 w-7 shrink-0 p-0 opacity-0 transition-opacity group-hover/header:opacity-100',
              menuOpen && 'opacity-100'
            )}
            aria-label="Column menu"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal size={14} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onSelect={onEdit}>Edit field</DropdownMenuItem>
          <DropdownMenuItem onSelect={onHide}>Hide in view</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onAddFieldBefore}>Add field before</DropdownMenuItem>
          <DropdownMenuItem onSelect={onAddFieldAfter}>Add field after</DropdownMenuItem>
          {!field.is_primary ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="danger" onSelect={onDelete}>
                Delete field
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        type="button"
        aria-label="Resize column"
        className="absolute right-0 top-0 z-[1] h-full w-1 cursor-col-resize touch-none select-none hover:bg-kern-accent/20"
        onMouseDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onResizeStart(e);
        }}
      />
    </div>
  );
}
