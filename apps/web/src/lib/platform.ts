/** True when running inside the native desktop shell (not the browser tab). */
export const isDesktop =
  typeof window !== 'undefined' && '__TAURI__' in window;
export const isWeb = !isDesktop;

/**
 * Host OS is macOS (WKWebView on Tauri, or Safari). Used for traffic-light layout
 * and fullscreen behavior; `navigator.platform` is still reliable for desktop shells.
 */
export const isMacOS =
  typeof navigator !== 'undefined' &&
  (Boolean(navigator.platform?.startsWith('Mac')) ||
    /\bMac OS X\b/.test(navigator.userAgent));
