import { useCallback, useEffect, useRef, useState } from 'react';

import type { CellComponentProps } from '@/components/cells/types';

type Props = Pick<
  CellComponentProps,
  'onSave' | 'onCancel' | 'onEditNavigate' | 'persistWhileEditing' | 'onPendingChange'
> & {
  display: string;
  inputType: 'email' | 'url' | 'tel';
  className?: string;
};

export function DebouncedStringCellEditor({
  display,
  inputType,
  className,
  onSave,
  onCancel,
  onEditNavigate,
  persistWhileEditing,
  onPendingChange,
}: Props) {
  const [editValue, setEditValue] = useState(display);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearDebounce = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    onPendingChange?.(false);
  }, [onPendingChange]);

  const schedulePersist = useCallback(
    (v: string) => {
      if (!persistWhileEditing) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      onPendingChange?.(true);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        persistWhileEditing(v);
        onPendingChange?.(false);
      }, 500);
    },
    [persistWhileEditing, onPendingChange]
  );

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      onPendingChange?.(false);
    },
    [onPendingChange]
  );

  return (
    <input
      autoFocus
      type={inputType}
      className={className}
      value={editValue}
      onChange={(e) => {
        const v = e.target.value;
        setEditValue(v);
        schedulePersist(v);
      }}
      onKeyDown={(e) => {
        const v = e.currentTarget.value.trim();
        if (e.key === 'Enter') {
          e.preventDefault();
          clearDebounce();
          onSave(v);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          clearDebounce();
          onCancel();
          return;
        }
        if (e.key === 'Tab') {
          e.preventDefault();
          clearDebounce();
          onSave(v);
          onEditNavigate?.(e.shiftKey ? 'prev' : 'next');
        }
      }}
      onBlur={() => {
        clearDebounce();
        onSave(editValue.trim());
      }}
    />
  );
}
