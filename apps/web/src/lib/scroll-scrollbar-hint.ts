/**
 * Native scrollbars that show a thumb always consume layout width/height. We keep
 * scrollbars invisible (no gutter) and draw a short-lived thumb with `position: fixed`
 * over the scrolling edge so content never reflows when scrolling.
 */

const HINT_MS = 850;
let hideTimer: number | null = null;

let overlayY: HTMLDivElement | null = null;
let overlayX: HTMLDivElement | null = null;

function thumbColor(): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--scrollbar-thumb').trim();
  return v || 'color-mix(in srgb, #9c9890 38%, transparent)';
}

function ensureY(): HTMLDivElement {
  if (!overlayY) {
    overlayY = document.createElement('div');
    overlayY.id = 'kern-scrollbar-overlay-y';
    overlayY.setAttribute('aria-hidden', 'true');
    Object.assign(overlayY.style, {
      position: 'fixed',
      pointerEvents: 'none',
      /* Above Popover/Dropdown (z-220) so the hint is visible when scrolling portaled menus */
      zIndex: '280',
      width: '6px',
      borderRadius: '9999px',
      opacity: '0',
      transition: 'opacity 120ms ease',
      willChange: 'opacity, top, left, height',
    });
    document.body.appendChild(overlayY);
  }
  return overlayY;
}

function ensureX(): HTMLDivElement {
  if (!overlayX) {
    overlayX = document.createElement('div');
    overlayX.id = 'kern-scrollbar-overlay-x';
    overlayX.setAttribute('aria-hidden', 'true');
    Object.assign(overlayX.style, {
      position: 'fixed',
      pointerEvents: 'none',
      zIndex: '280',
      height: '6px',
      borderRadius: '9999px',
      opacity: '0',
      transition: 'opacity 120ms ease',
      willChange: 'opacity, top, left, width',
    });
    document.body.appendChild(overlayX);
  }
  return overlayX;
}

function hideOverlays() {
  if (overlayY) overlayY.style.opacity = '0';
  if (overlayX) overlayX.style.opacity = '0';
}

function scheduleHide() {
  if (hideTimer != null) window.clearTimeout(hideTimer);
  hideTimer = window.setTimeout(() => {
    hideOverlays();
    hideTimer = null;
  }, HINT_MS);
}

function clamp01(v: number): number {
  if (v <= 0) return 0;
  if (v >= 1) return 1;
  return v;
}

/** RTL overflow uses mixed scrollLeft sign/semantics across engines. */
function horizontalThumbProgress(host: HTMLElement, maxX: number): number {
  if (maxX <= 0) return 0;
  const rtl = getComputedStyle(host).direction === 'rtl';
  const sl = host.scrollLeft;
  if (!rtl) return clamp01(sl / maxX);
  if (sl < 0) return clamp01(1 + sl / maxX);
  return clamp01(1 - sl / maxX);
}

function resolveScrollHost(target: EventTarget | null): HTMLElement | null {
  if (target instanceof HTMLElement) return target;
  if (target === document) return document.documentElement;
  return null;
}

function isViewportScroller(host: HTMLElement): boolean {
  const root = document.scrollingElement;
  return host === document.documentElement || host === document.body || host === root;
}

function refreshOverlays(host: HTMLElement) {
  const root = (
    isViewportScroller(host) ? (document.scrollingElement ?? document.documentElement) : host
  ) as HTMLElement;
  const rect = isViewportScroller(host)
    ? new DOMRect(
        window.visualViewport?.offsetLeft ?? 0,
        window.visualViewport?.offsetTop ?? 0,
        window.visualViewport?.width ?? window.innerWidth,
        window.visualViewport?.height ?? window.innerHeight,
      )
    : root.getBoundingClientRect();
  const ch = root.clientHeight;
  const sh = root.scrollHeight;
  const cw = root.clientWidth;
  const sw = root.scrollWidth;
  const scrollTop = root.scrollTop;
  const rtl = getComputedStyle(root).direction === 'rtl';

  const minThumb = 12;
  let any = false;

  if (sh > ch + 1) {
    const el = ensureY();
    const thumbH = Math.min(ch, Math.max(minThumb, (ch / sh) * ch));
    const maxY = Math.max(0, sh - ch);
    const y = maxY > 0 ? scrollTop / maxY : 0;
    const track = Math.max(0, ch - thumbH);
    const top = rect.top + y * track;
    const left = rtl ? rect.left : rect.right - 6;
    el.style.backgroundColor = thumbColor();
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    el.style.height = `${thumbH}px`;
    el.style.width = '6px';
    el.style.opacity = '0.9';
    any = true;
  } else if (overlayY) {
    overlayY.style.opacity = '0';
  }

  if (sw > cw + 1) {
    const el = ensureX();
    const thumbW = Math.min(cw, Math.max(minThumb, (cw / sw) * cw));
    const maxX = Math.max(0, sw - cw);
    const x = horizontalThumbProgress(root, maxX);
    const track = Math.max(0, cw - thumbW);
    const left = rect.left + x * track;
    el.style.backgroundColor = thumbColor();
    el.style.left = `${left}px`;
    el.style.top = `${rect.bottom - 6}px`;
    el.style.width = `${thumbW}px`;
    el.style.height = '6px';
    el.style.opacity = '0.9';
    any = true;
  } else if (overlayX) {
    overlayX.style.opacity = '0';
  }

  if (any) scheduleHide();
}

function findVerticalScrollHost(start: Element | null): HTMLElement | null {
  let n: HTMLElement | null = start instanceof HTMLElement ? start : null;
  while (n) {
    const s = getComputedStyle(n);
    const oy = s.overflowY;
    if (
      (oy === 'auto' || oy === 'scroll' || oy === 'overlay') &&
      n.scrollHeight > n.clientHeight + 1
    ) {
      return n;
    }
    n = n.parentElement;
  }
  const root = document.documentElement;
  if (root.scrollHeight > root.clientHeight + 1) return root;
  return null;
}

function findHorizontalScrollHost(start: Element | null): HTMLElement | null {
  let n: HTMLElement | null = start instanceof HTMLElement ? start : null;
  while (n) {
    const s = getComputedStyle(n);
    const ox = s.overflowX;
    if (
      (ox === 'auto' || ox === 'scroll' || ox === 'overlay') &&
      n.scrollWidth > n.clientWidth + 1
    ) {
      return n;
    }
    n = n.parentElement;
  }
  const root = document.documentElement;
  if (root.scrollWidth > root.clientWidth + 1) return root;
  return null;
}

function onScrollCapture(e: Event) {
  const host = resolveScrollHost(e.target);
  if (host) refreshOverlays(host);
}

function onWheelCapture(e: Event) {
  if (!(e instanceof WheelEvent)) return;
  const start = e.target instanceof Element ? e.target : null;
  const vy = Math.abs(e.deltaY) >= Math.abs(e.deltaX);
  const host = vy ? findVerticalScrollHost(start) : findHorizontalScrollHost(start);
  if (host) refreshOverlays(host);
}

/** Call once at app startup (import for side effects). */
export function initScrollScrollbarHint() {
  document.addEventListener('scroll', onScrollCapture, true);
  window.addEventListener('wheel', onWheelCapture, { passive: true, capture: true });
  window.addEventListener('resize', hideOverlays);
}
