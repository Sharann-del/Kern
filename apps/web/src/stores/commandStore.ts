import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const MAX_RECENT = 10;

type CommandStore = {
  recentCommandIds: string[];
  addRecentCommand: (id: string) => void;
};

export const useCommandStore = create<CommandStore>()(
  persist(
    (set) => ({
      recentCommandIds: [],
      addRecentCommand: (id: string) =>
        set((s) => {
          const without = s.recentCommandIds.filter((x) => x !== id);
          return { recentCommandIds: [id, ...without].slice(0, MAX_RECENT) };
        }),
    }),
    { name: 'kern-commands' }
  )
);
