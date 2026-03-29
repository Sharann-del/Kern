/**
 * Shell layout — keep in sync across AppShell, Sidebar, Topbar, RowEditorPanel, etc.
 * Topbar height must match `--layout-topbar-h` in `index.css` (used by `min-h-shell-main`).
 */
/** Custom title bar offset when running as the native desktop shell (frameless window). */
export const LAYOUT_DESKTOP_TITLEBAR_PX = 28;

/** Match `--layout-topbar-h` / tallest Topbar row (view tabs) so every route uses the same bar height. */
export const LAYOUT_TOPBAR_PX = 54;
export const LAYOUT_SIDEBAR_EXPANDED_PX = 220;

/**
 * Sidebar width only (flex row) — avoid animating `margin-left` on main (layout thrash + shake vs transform).
 */
export const LAYOUT_SIDEBAR_TRANSITION_MS = 480;
/** Gentle ease-out (minimal overshoot / snap). */
export const LAYOUT_SIDEBAR_TRANSITION_EASING = 'cubic-bezier(0.33, 1, 0.68, 1)';
export const LAYOUT_SIDEBAR_TRANSITION = `${LAYOUT_SIDEBAR_TRANSITION_MS}ms ${LAYOUT_SIDEBAR_TRANSITION_EASING}`;
