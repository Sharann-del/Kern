import type { ReactNode } from 'react';

type AuthPageShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer: ReactNode;
};

export function AuthPageShell({ title, subtitle, children, footer }: AuthPageShellProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-kern-bg px-4 py-12">
      <div className="w-full max-w-[400px] rounded-ds-md border border-kern-border bg-kern-surface p-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-kern-text-3">
          kern
        </p>
        <h1 className="mt-5 text-xl font-semibold tracking-tight text-kern-text">{title}</h1>
        {subtitle ? (
          <p className="mt-1.5 text-sm leading-relaxed text-kern-text-2">{subtitle}</p>
        ) : null}
        <div className="mt-8 text-left">{children}</div>
        <div className="mt-10 border-t border-kern-border pt-6 text-center text-sm text-kern-text-2">
          {footer}
        </div>
      </div>
    </div>
  );
}
