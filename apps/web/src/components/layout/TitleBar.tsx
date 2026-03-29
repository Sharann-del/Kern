import { useCallback, type ReactNode } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';

import { isMacOS } from '@/lib/platform';
import { cn } from '@/lib/utils';

function WindowControl({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        'group flex h-7 w-7 shrink-0 cursor-default items-center justify-center rounded border-0 bg-transparent p-0',
        'focus-visible:outline-none focus-visible:ring-0'
      )}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {children}
    </button>
  );
}

function WindowsTrafficLights() {
  const onClose = useCallback(() => {
    void getCurrentWindow().close();
  }, []);
  const onMinimize = useCallback(() => {
    void getCurrentWindow().minimize();
  }, []);
  const onToggleMaximize = useCallback(() => {
    void getCurrentWindow().toggleMaximize();
  }, []);

  const dot = 'relative flex h-3 w-3 items-center justify-center rounded-full';

  return (
    <>
      <WindowControl label="Close window" onClick={onClose}>
        <span className={cn(dot, 'bg-[#e05252]')}>
          <X
            className="absolute h-2 w-2 text-[#1A1A18] opacity-0 transition-opacity duration-150 group-hover:opacity-100"
            strokeWidth={2.5}
          />
        </span>
      </WindowControl>
      <WindowControl label="Minimize window" onClick={onMinimize}>
        <span className={cn(dot, 'bg-[#d4a847]')}>
          <Minus
            className="absolute h-2 w-2 text-[#1A1A18] opacity-0 transition-opacity duration-150 group-hover:opacity-100"
            strokeWidth={2.5}
          />
        </span>
      </WindowControl>
      <WindowControl label="Maximize window" onClick={onToggleMaximize}>
        <span className={cn(dot, 'bg-[#52a869]')}>
          <Plus
            className="absolute h-2 w-2 text-[#1A1A18] opacity-0 transition-opacity duration-150 group-hover:opacity-100"
            strokeWidth={2.5}
          />
        </span>
      </WindowControl>
    </>
  );
}

export function TitleBar() {
  return (
    <div
      className={cn(
        'fixed left-0 right-0 top-0 z-[60] h-7 border-b border-[#2A2A28] bg-[#1A1A18]'
      )}
    >
      <div className="absolute inset-0 z-0" data-tauri-drag-region />

      {isMacOS ? (
        <div className="relative z-10 flex h-full w-full items-center justify-center pointer-events-none">
          <span className="kern-display-italic pointer-events-none select-none text-[15px] leading-none text-[#E8E6E1]">
            kern
          </span>
        </div>
      ) : (
        <div className="relative z-10 flex h-full w-full items-stretch pointer-events-none">
          <div className="relative flex min-w-0 flex-1 items-center justify-center px-14">
            <span className="kern-display-italic pointer-events-none select-none text-[15px] leading-none text-[#E8E6E1]">
              kern
            </span>
          </div>
          <div className="pointer-events-auto flex shrink-0 items-center gap-2 pr-2">
            <WindowsTrafficLights />
          </div>
        </div>
      )}
    </div>
  );
}
