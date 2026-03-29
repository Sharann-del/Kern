import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { KernCollection } from '@/types/kern';

interface AppState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  paletteOpen: boolean;
  openPalette: () => void;
  closePalette: () => void;
  openRowId: string | null;
  openRowCollectionId: string | null;
  openRow: (rowId: string, collectionId: string) => void;
  closeRow: () => void;
  activeCollectionSlug: string | null;
  setActiveCollection: (slug: string | null) => void;
  createCollectionModalOpen: boolean;
  openCreateCollectionModal: () => void;
  closeCreateCollectionModal: () => void;
  collectionForEdit: KernCollection | null;
  openCollectionEditModal: (c: KernCollection) => void;
  closeCollectionEditModal: () => void;
  collectionForDelete: KernCollection | null;
  openCollectionDeleteDialog: (c: KernCollection) => void;
  closeCollectionDeleteDialog: () => void;
  filtersPopoverOpen: boolean;
  setFiltersPopoverOpen: (open: boolean) => void;
  keyboardShortcutsModalOpen: boolean;
  openKeyboardShortcutsModal: () => void;
  closeKeyboardShortcutsModal: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      paletteOpen: false,
      openPalette: () => set({ paletteOpen: true }),
      closePalette: () => set({ paletteOpen: false }),
      openRowId: null,
      openRowCollectionId: null,
      openRow: (rowId, collectionId) =>
        set({ openRowId: rowId, openRowCollectionId: collectionId }),
      closeRow: () => set({ openRowId: null, openRowCollectionId: null }),
      activeCollectionSlug: null,
      setActiveCollection: (slug) => set({ activeCollectionSlug: slug }),
      createCollectionModalOpen: false,
      openCreateCollectionModal: () => set({ createCollectionModalOpen: true }),
      closeCreateCollectionModal: () => set({ createCollectionModalOpen: false }),
      collectionForEdit: null,
      openCollectionEditModal: (c) => set({ collectionForEdit: c }),
      closeCollectionEditModal: () => set({ collectionForEdit: null }),
      collectionForDelete: null,
      openCollectionDeleteDialog: (c) => set({ collectionForDelete: c }),
      closeCollectionDeleteDialog: () => set({ collectionForDelete: null }),
      filtersPopoverOpen: false,
      setFiltersPopoverOpen: (open) => set({ filtersPopoverOpen: open }),
      keyboardShortcutsModalOpen: false,
      openKeyboardShortcutsModal: () => set({ keyboardShortcutsModalOpen: true }),
      closeKeyboardShortcutsModal: () => set({ keyboardShortcutsModalOpen: false }),
    }),
    {
      name: 'kern-ui',
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
    }
  )
);
