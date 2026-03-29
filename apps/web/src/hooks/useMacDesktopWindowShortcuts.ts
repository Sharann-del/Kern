import { useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

import { isDesktop, isMacOS } from '@/lib/platform';

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.closest('input, textarea, [contenteditable="true"]')) return true;
  return target.isContentEditable;
}

/**
 * macOS desktop shell only: no traffic lights — use standard shortcuts instead.
 * Capture phase so we beat browser defaults (e.g. ⌘W).
 */
export function useMacDesktopWindowShortcuts(): void {
  useEffect(() => {
    if (!isDesktop || !isMacOS) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.metaKey || e.ctrlKey || e.altKey) return;

      const k = e.key;
      if (k === 'q' || k === 'Q') {
        e.preventDefault();
        void getCurrentWindow().destroy();
        return;
      }
      if (k === 'w' || k === 'W') {
        e.preventDefault();
        void getCurrentWindow().close();
        return;
      }
      if (k === 'm' || k === 'M') {
        e.preventDefault();
        void getCurrentWindow().minimize();
        return;
      }
      if (k === 'f' || k === 'F') {
        if (isEditableTarget(e.target)) return;
        e.preventDefault();
        void (async () => {
          const w = getCurrentWindow();
          const fs = await w.isFullscreen();
          await w.setFullscreen(!fs);
        })();
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, []);
}
