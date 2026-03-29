import { useEffect, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { KernToaster } from '@/components/ui/KernToaster';

import { CreateCollectionModal } from '@/components/collection/CreateCollectionModal';
import { DeleteCollectionDialog } from '@/components/collection/DeleteCollectionDialog';
import { EditCollectionModal } from '@/components/collection/EditCollectionModal';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { RowEditorPanel } from '@/components/layout/RowEditorPanel';
import {
  LAYOUT_DESKTOP_TITLEBAR_PX,
  LAYOUT_TOPBAR_PX,
} from '@/components/layout/layoutConstants';
import { Sidebar } from '@/components/layout/Sidebar';
import { TitleBar } from '@/components/layout/TitleBar';
import { Topbar } from '@/components/layout/Topbar';
import { CollectionChromeProvider } from '@/contexts/CollectionChromeContext';
import { WelcomeOnboardingModal } from '@/components/onboarding/WelcomeOnboardingModal';
import { KeyboardShortcutsModal } from '@/components/ui/KeyboardShortcutsModal';
import { useCollections } from '@/hooks/useCollections';
import { useAuth } from '@/providers/AuthProvider';
import { isDesktop } from '@/lib/platform';
import { useMacDesktopWindowShortcuts } from '@/hooks/useMacDesktopWindowShortcuts';
import { useAppStore } from '@/stores/appStore';

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.closest('input, textarea, [contenteditable="true"]')) return true;
  return target.isContentEditable;
}

export function AppShell() {
  useMacDesktopWindowShortcuts();
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, updateProfile } = useAuth();
  const { data: collections = [], isLoading: colLoading } = useCollections();
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

  const welcomeOpen = Boolean(
    user &&
      profile &&
      !authLoading &&
      !colLoading &&
      collections.length === 0 &&
      profile.preferences.onboarded !== true
  );

  useEffect(() => {
    if (!user || !profile) return;
    if (collections.length === 0) return;
    if (profile.preferences.onboarded === true) return;
    void updateProfile({ preferences: { ...profile.preferences, onboarded: true } });
  }, [user, profile?.preferences.onboarded, collections.length, updateProfile]);

  const chordArmRef = useRef(false);
  const chordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const welcomeOpenRef = useRef(welcomeOpen);
  welcomeOpenRef.current = welcomeOpen;

  useEffect(() => {
    const cancelChord = () => {
      chordArmRef.current = false;
      if (chordTimerRef.current !== null) {
        clearTimeout(chordTimerRef.current);
        chordTimerRef.current = null;
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) {
        cancelChord();
        return;
      }
      if (isEditableTarget(e.target)) {
        cancelChord();
        return;
      }
      if (welcomeOpenRef.current) {
        cancelChord();
        return;
      }

      const st = useAppStore.getState();
      if (
        st.paletteOpen ||
        st.keyboardShortcutsModalOpen ||
        st.createCollectionModalOpen ||
        st.collectionForEdit ||
        st.collectionForDelete ||
        st.openRowId
      ) {
        cancelChord();
        return;
      }

      const k = e.key.length === 1 ? e.key.toLowerCase() : '';

      if (chordArmRef.current) {
        if (k === 'd') {
          e.preventDefault();
          cancelChord();
          navigate('/dashboard');
          return;
        }
        if (k === 's') {
          e.preventDefault();
          cancelChord();
          navigate('/settings');
          return;
        }
        if (k !== 'g') {
          cancelChord();
        }
      }

      if (k === 'g') {
        e.preventDefault();
        chordArmRef.current = true;
        if (chordTimerRef.current !== null) clearTimeout(chordTimerRef.current);
        chordTimerRef.current = setTimeout(() => {
          chordArmRef.current = false;
          chordTimerRef.current = null;
        }, 500);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      cancelChord();
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [navigate]);

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

  const shellTopInset =
    LAYOUT_TOPBAR_PX + (isDesktop ? LAYOUT_DESKTOP_TITLEBAR_PX : 0);

  return (
    <CollectionChromeProvider>
      <div className="flex min-h-screen flex-col bg-kern-bg">
        {isDesktop ? <TitleBar /> : null}
        <Topbar />
        <div
          className="flex min-h-0 w-full overflow-hidden"
          style={{
            marginTop: shellTopInset,
            height: `calc(100vh - ${shellTopInset}px)`,
          }}
        >
          <Sidebar />
          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-kern-bg text-kern-text">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <Outlet />
            </div>
          </main>
        </div>
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
      <WelcomeOnboardingModal open={welcomeOpen} />
      <KernToaster />
      </div>
    </CollectionChromeProvider>
  );
}
