import { AlertTriangle, CheckCircle2, Info, Loader2, OctagonAlert, X } from 'lucide-react';
import { Toaster } from 'sonner';

import { useTheme } from '@/providers/ThemeProvider';

const iconSm = 'shrink-0 opacity-[0.88]';

/**
 * Sonner wired to Kern theme + tokens (see index.css [data-sonner-*] overrides).
 */
export function KernToaster() {
  const { theme } = useTheme();

  return (
    <Toaster
      position="bottom-right"
      theme={theme}
      richColors={false}
      closeButton
      expand={false}
      gap={10}
      icons={{
        success: (
          <CheckCircle2 size={17} strokeWidth={1.85} className={`${iconSm} text-[var(--color-green)]`} />
        ),
        error: (
          <OctagonAlert size={17} strokeWidth={1.85} className={`${iconSm} text-[var(--color-red)]`} />
        ),
        warning: (
          <AlertTriangle size={17} strokeWidth={1.85} className={`${iconSm} text-[var(--color-yellow)]`} />
        ),
        info: <Info size={17} strokeWidth={1.85} className={`${iconSm} text-[var(--color-blue)]`} />,
        loading: <Loader2 size={17} strokeWidth={1.85} className={`${iconSm} animate-spin text-kern-text-3`} />,
        close: <X size={13} strokeWidth={2} className="text-kern-text-3" aria-hidden />,
      }}
      toastOptions={{
        classNames: {
          toast: 'font-sans',
          title: 'text-[13px] font-medium leading-snug',
          description: 'text-[12px] leading-relaxed text-kern-text-2',
        },
      }}
    />
  );
}
