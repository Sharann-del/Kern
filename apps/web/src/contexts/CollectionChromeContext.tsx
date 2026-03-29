import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

/** Stable setter — consumers do not re-render when chrome node changes. */
const CollectionChromeSetterContext = createContext<((node: ReactNode | null) => void) | null>(null);

/** Chrome tree — only Topbar (and similar) should subscribe. */
const CollectionChromeNodeContext = createContext<ReactNode | null>(null); // default: no provider → null

export function CollectionChromeProvider({ children }: { children: ReactNode }) {
  const [chrome, setChrome] = useState<ReactNode | null>(null);
  const setCollectionChrome = useCallback((node: ReactNode | null) => {
    setChrome(node);
  }, []);

  return (
    <CollectionChromeSetterContext.Provider value={setCollectionChrome}>
      <CollectionChromeNodeContext.Provider value={chrome}>{children}</CollectionChromeNodeContext.Provider>
    </CollectionChromeSetterContext.Provider>
  );
}

/** For CollectionPage: stable identity — avoids re-renders when chrome updates (prevents setChrome loops). */
export function useSetCollectionChrome(): (node: ReactNode | null) => void {
  const fn = useContext(CollectionChromeSetterContext);
  if (!fn) {
    throw new Error('useSetCollectionChrome must be used within CollectionChromeProvider');
  }
  return fn;
}

/** For Topbar — re-renders when chrome changes. Returns null outside provider. */
export function useCollectionChromeNodeOptional(): ReactNode | null {
  return useContext(CollectionChromeNodeContext);
}
