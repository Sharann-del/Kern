/** Droppable id prefix for Kanban columns (must not collide with row UUIDs). */
export const KANBAN_DROP_PREFIX = 'kern-kanban:' as const;

export function kanbanColumnDroppableId(columnId: string) {
  return `${KANBAN_DROP_PREFIX}${columnId}`;
}
