/** True when running inside the native desktop shell (not the browser tab). */
export const isDesktop =
  typeof window !== 'undefined' && '__TAURI__' in window;
export const isWeb = !isDesktop;
