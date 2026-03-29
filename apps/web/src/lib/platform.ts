export const isDesktop =
  typeof window !== 'undefined' && '__TAURI__' in window;
export const isWeb = !isDesktop;
