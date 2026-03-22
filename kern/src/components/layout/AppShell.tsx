import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Toaster } from 'sonner';

import { CreateCollectionModal } from '@/components/collection/CreateCollectionModal';
import { DeleteCollectionDialog } from '@/components/collection/DeleteCollectionDialog';
import { EditCollectionModal } from '@/components/collection/EditCollectionModal';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { RowEditorPanel } from '@/components/layout/RowEditorPanel';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { KeyboardShortcutsModal } from '@/components/ui/KeyboardShortcutsModal';
import { useAppStore } from '@/stores/appStore';

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.closest('input, textarea, [contenteditable="true"]')) return true;
  return target.isContentEditable;
}

export function AppShell() {
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const openPalette = useAppStore((s) => s.openPalette);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const openCreateCollectionModal = useAppStore((s) => s.openCreateCollectionModal);
  const createCollectionModalOpen = useAppStore((s) => s.createCollectionModalOpen);
  const closeCreateCollectionModal = useAppStore((s) => s.closeCreateCollectionModal);
  const collectionForEdit = useAppStore((s) => s.collectionForEdit);
  const closeCollectionEditModal = useAppStore((s) => s.closeCollectionEditModal);
  const collectionForDelete = useAppStore((s) => s.collectionForDelete);
  const closeCollectionDeleteDialog = useAppStore((s) => s.closeCollectionDeleteDialog);
  const keyboardShortcutsModalOpen = useAppStore((s) => s.keyboardShortcutsModalOpen);
  const closeKeyboardShortcutsModal = useAppStore((s) => s.closeKeyboardShortcutsModal);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      if (e.key === 'k' || e.key === 'K') {
        if (isEditableTarget(e.target)) return;
        e.preventDefault();
        openPalette();
        return;
      }

      if (e.key === 'n' || e.key === 'N') {
        if (isEditableTarget(e.target)) return;
        e.preventDefault();
        openCreateCollectionModal();
        return;
      }

      if (e.key === '\\') {
        e.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openPalette, openCreateCollectionModal, toggleSidebar]);

  const mainMarginLeft = sidebarCollapsed ? 48 : 240;

  return (
    <div className="flex min-h-screen flex-col">
      <Topbar />
      <Sidebar />
      <main
        className="flex-1 overflow-y-auto bg-kern-bg"
        style={{
          marginTop: 48,
          marginLeft: mainMarginLeft,
          transition: 'margin-left 200ms ease',
          minHeight: 'calc(100vh - 48px)',
        }}
      >
        <Outlet />
      </main>
      <CommandPalette />
      <RowEditorPanel />
      <CreateCollectionModal
        open={createCollectionModalOpen}
        onOpenChange={(o) => {
          if (!o) closeCreateCollectionModal();
        }}
      />
      <EditCollectionModal
        open={Boolean(collectionForEdit)}
        collection={collectionForEdit}
        onOpenChange={(o) => {
          if (!o) closeCollectionEditModal();
        }}
      />
      <DeleteCollectionDialog collection={collectionForDelete} onClose={closeCollectionDeleteDialog} />
      <KeyboardShortcutsModal
        open={keyboardShortcutsModalOpen}
        onOpenChange={(o) => {
          if (!o) closeKeyboardShortcutsModal();
        }}
      />
      <Toaster position="bottom-right" richColors closeButton />
    </div>
  );
}
