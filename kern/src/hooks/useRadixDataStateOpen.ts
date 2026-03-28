import { useLayoutEffect, useState } from 'react';

/** Syncs to Radix `data-state="open" | "closed"` on a mounted element (e.g. Dropdown/Popover content with `forceMount`). */
export function useRadixDataStateOpen(element: HTMLElement | null) {
  const [open, setOpen] = useState(false);

  useLayoutEffect(() => {
    if (!element) return;
    const read = () => setOpen(element.getAttribute('data-state') === 'open');
    read();
    const mo = new MutationObserver(read);
    mo.observe(element, { attributes: true, attributeFilter: ['data-state'] });
    return () => mo.disconnect();
  }, [element]);

  return open;
}
