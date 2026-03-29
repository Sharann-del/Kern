import { forwardRef, useId, type InputHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

export type InputProps = {
  label?: string;
  error?: string;
  helperText?: string;
} & InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, helperText, id, className, ...props },
  ref
) {
  const uid = useId();
  const inputId = id ?? uid;
  const describedBy =
    error ?? helperText ? `${uid}-${error ? 'err' : 'help'}` : undefined;

  return (
    <div className={cn('w-full', className)}>
      {label ? (
        <label htmlFor={inputId} className="mb-1 block text-xs text-kern-text-2">
          {label}
        </label>
      ) : null}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          'h-8 w-full rounded-kern-md border bg-kern-bg px-3 text-sm text-kern-text outline-none transition-shadow duration-ds-fast',
          'placeholder:text-kern-text-3',
          'focus-visible:border-kern-border focus-visible:ring-0',
          error
            ? 'border-kern-danger focus-visible:border-kern-danger focus-visible:ring-0'
            : 'border-kern-border'
        )}
        {...props}
      />
      {error ? (
        <p id={describedBy} className="mt-1 text-xs text-kern-danger" role="alert">
          {error}
        </p>
      ) : helperText ? (
        <p id={describedBy} className="mt-1 text-xs text-kern-text-2">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});
