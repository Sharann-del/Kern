import type { DashboardWidget } from '@/types/kern';

function overlaps(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number
) {
  const col = Math.max(ax, bx) < Math.min(ax + aw, bx + bw);
  const row = Math.max(ay, by) < Math.min(ay + ah, by + bh);
  return col && row;
}

export function findFirstEmptySpot(
  widgets: Pick<DashboardWidget, 'position_x' | 'position_y' | 'width' | 'height'>[],
  w = 2,
  h = 2
): { x: number; y: number } | null {
  for (let y = 1; y <= 10; y++) {
    for (let x = 1; x <= 11; x++) {
      const clash = widgets.some((wi) =>
        overlaps(x, y, w, h, wi.position_x, wi.position_y, wi.width, wi.height)
      );
      if (!clash) return { x, y };
    }
  }
  return null;
}
