import type { SpaceMap } from '../../domain/map/space-map.types';

const LIMIT = 50;

export function createMapHistory() {
  const past: SpaceMap[] = [];
  const future: SpaceMap[] = [];
  return {
    push(prev: SpaceMap) {
      past.push(prev);
      if (past.length > LIMIT) past.shift();
      future.length = 0;
    },
    undo(current: SpaceMap): SpaceMap | null {
      const prev = past.pop();
      if (!prev) return null;
      future.push(current);
      return prev;
    },
    redo(current: SpaceMap): SpaceMap | null {
      const next = future.pop();
      if (!next) return null;
      past.push(current);
      return next;
    },
    canUndo() {
      return past.length > 0;
    },
    canRedo() {
      return future.length > 0;
    },
  };
}

export type MapHistory = ReturnType<typeof createMapHistory>;
