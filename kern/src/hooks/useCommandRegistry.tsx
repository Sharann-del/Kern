import type { ComponentType } from 'react';
import { useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Calendar,
  Code2,
  Columns2,
  Copy,
  Filter,
  FilterX,
  Folder,
  Keyboard,
  LayoutDashboard,
  LayoutGrid,
  PanelLeft,
  Pencil,
  Plus,
  PlusCircle,
  Settings,
  Table2,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import { useCollection, useCollections } from '@/hooks/useCollections';
import { useFields } from '@/hooks/useFields';
import { useCreateRow } from '@/hooks/useRows';
import { useCreateView, useUpdateView, useViews } from '@/hooks/useViews';
import { OPERATORS_BY_FIELD_TYPE } from '@/lib/field-operators';
import { getMcpServerUrl } from '@/lib/mcp-url';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/appStore';
import type { CommandDefinition, CommandIconProps } from '@/types/command';
import type { KernCollection } from '@/types/kern';

function makeCollectionIcon(collection: KernCollection): ComponentType<CommandIconProps> {
  return function CollectionCmdIcon({ size = 16, className }: CommandIconProps) {
    if (collection.icon) {
      return (
        <span
          className={cn('inline-flex shrink-0 items-center justify-center leading-none', className)}
          style={{ fontSize: size }}
          aria-hidden
        >
          {collection.icon}
        </span>
      );
    }
    return (
      <Folder
        size={size}
        className={cn('text-kern-text-3', className)}
        style={{ color: collection.color ?? undefined }}
      />
    );
  };
}

export function useCommandRegistry(): CommandDefinition[] {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const openRow = useAppStore((s) => s.openRow);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const openCreateCollectionModal = useAppStore((s) => s.openCreateCollectionModal);
  const openCollectionEditModal = useAppStore((s) => s.openCollectionEditModal);
  const openCollectionDeleteDialog = useAppStore((s) => s.openCollectionDeleteDialog);
  const setFiltersPopoverOpen = useAppStore((s) => s.setFiltersPopoverOpen);
  const openKeyboardShortcutsModal = useAppStore((s) => s.openKeyboardShortcutsModal);

  const { data: collections = [] } = useCollections();
  const routeMatch = /^\/c\/([^/]+)/.exec(location.pathname);
  const routeSlug = routeMatch?.[1] ?? '';
  const { data: activeCollection } = useCollection(routeSlug);
  const collectionId = activeCollection?.id ?? '';
  const { data: fields = [] } = useFields(collectionId);
  const { data: views = [] } = useViews(collectionId);

  const createView = useCreateView();
  const updateView = useUpdateView();
  const createRow = useCreateRow();

  const onCollectionPage = Boolean(activeCollection?.id);
  const viewParam = searchParams.get('view');
  const activeView =
    viewParam && views.some((v) => v.id === viewParam)
      ? views.find((v) => v.id === viewParam)!
      : (views[0] ?? null);

  return useMemo(() => {
    const list: CommandDefinition[] = [];

    list.push(
      {
        id: 'nav-dashboard',
        group: 'Navigation',
        label: 'Go to Dashboard',
        icon: LayoutDashboard,
        shortcut: 'G then D',
        keywords: 'home',
        action: () => navigate('/dashboard'),
      },
      {
        id: 'nav-settings',
        group: 'Navigation',
        label: 'Go to Settings',
        icon: Settings,
        shortcut: 'G then S',
        action: () => navigate('/settings'),
      },
      {
        id: 'nav-sidebar',
        group: 'Navigation',
        label: 'Toggle sidebar',
        icon: PanelLeft,
        shortcut: '⌘\\',
        action: () => toggleSidebar(),
      }
    );

    for (const c of collections) {
      list.push({
        id: `nav-col-${c.slug}`,
        group: 'Navigation',
        label: `Go to ${c.name}`,
        icon: makeCollectionIcon(c),
        keywords: `${c.slug} ${c.name}`,
        action: () => navigate(`/c/${c.slug}`),
      });
    }

    list.push({
      id: 'col-create',
      group: 'Collections',
      label: 'Create new collection',
      icon: Plus,
      shortcut: '⌘N',
      action: () => openCreateCollectionModal(),
    });

    if (activeCollection) {
      list.push(
        {
          id: 'col-edit',
          group: 'Collections',
          label: `Edit ${activeCollection.name}`,
          icon: Pencil,
          action: () => openCollectionEditModal(activeCollection),
        },
        {
          id: 'col-delete',
          group: 'Collections',
          label: `Delete ${activeCollection.name}`,
          icon: Trash2,
          keywords: 'remove',
          action: () => openCollectionDeleteDialog(activeCollection),
        }
      );
    }

    if (onCollectionPage) {
      for (const c of collections) {
        list.push({
          id: `row-add-${c.slug}`,
          group: 'Rows',
          label: `Add row to ${c.name}`,
          icon: PlusCircle,
          keywords: c.slug,
          action: () => {
            void createRow.mutateAsync({ collectionId: c.id, data: {} }).then((row) => {
              toast.success('Row added');
              openRow(row.id, c.id);
            });
          },
        });
      }

      const slug = activeCollection?.slug ?? routeSlug;

      list.push(
        {
          id: 'view-add-table',
          group: 'Views',
          label: 'Add table view',
          icon: Table2,
          action: () => {
            if (!collectionId) return;
            createView.mutate({ collectionId, type: 'table' });
          },
        },
        {
          id: 'view-add-kanban',
          group: 'Views',
          label: 'Add kanban view',
          icon: Columns2,
          action: () => {
            if (!collectionId) return;
            createView.mutate({ collectionId, type: 'kanban' });
          },
        },
        {
          id: 'view-add-calendar',
          group: 'Views',
          label: 'Add calendar view',
          icon: Calendar,
          action: () => {
            if (!collectionId) return;
            createView.mutate({ collectionId, type: 'calendar' });
          },
        },
        {
          id: 'view-add-gallery',
          group: 'Views',
          label: 'Add gallery view',
          icon: LayoutGrid,
          action: () => {
            if (!collectionId) return;
            createView.mutate({ collectionId, type: 'gallery' });
          },
        },
        {
          id: 'view-add-custom',
          group: 'Views',
          label: 'New custom view',
          icon: Code2,
          action: () => {
            if (!slug) return;
            navigate(`/c/${slug}/views/custom/new`);
          },
        }
      );

      if (activeView) {
        list.push({
          id: 'view-clear-filters',
          group: 'Views',
          label: 'Clear all filters',
          icon: FilterX,
          action: () => {
            updateView.mutate({
              id: activeView.id,
              collectionId,
              config: { filters: [] },
            });
          },
        });
      }

      if (fields.length > 0) {
        for (const field of fields) {
          const firstOp = OPERATORS_BY_FIELD_TYPE[field.type][0]?.operator ?? 'contains';
          list.push({
            id: `filter-${field.slug}`,
            group: 'Filters',
            label: `Filter by ${field.name}`,
            icon: Filter,
            keywords: field.slug,
            action: () => {
              if (!activeView || !collectionId) return;
              const newRule = {
                id: crypto.randomUUID(),
                field_slug: field.slug,
                operator: firstOp,
                value: '',
              };
              updateView.mutate({
                id: activeView.id,
                collectionId,
                config: { filters: [...activeView.config.filters, newRule] },
              });
              setFiltersPopoverOpen(true);
            },
          });

          list.push(
            {
              id: `sort-${field.slug}-asc`,
              group: 'Sorts',
              label: `Sort by ${field.name} A→Z`,
              icon: ArrowUpAZ,
              keywords: `${field.slug} ascending`,
              action: () => {
                if (!activeView || !collectionId) return;
                updateView.mutate({
                  id: activeView.id,
                  collectionId,
                  config: {
                    sorts: [
                      {
                        id: crypto.randomUUID(),
                        field_slug: field.slug,
                        direction: 'asc',
                      },
                    ],
                  },
                });
              },
            },
            {
              id: `sort-${field.slug}-desc`,
              group: 'Sorts',
              label: `Sort by ${field.name} Z→A`,
              icon: ArrowDownAZ,
              keywords: `${field.slug} descending`,
              action: () => {
                if (!activeView || !collectionId) return;
                updateView.mutate({
                  id: activeView.id,
                  collectionId,
                  config: {
                    sorts: [
                      {
                        id: crypto.randomUUID(),
                        field_slug: field.slug,
                        direction: 'desc',
                      },
                    ],
                  },
                });
              },
            }
          );
        }
      }
    }

    list.push(
      {
        id: 'settings-open',
        group: 'Settings',
        label: 'Open settings',
        icon: Settings,
        action: () => navigate('/settings'),
      },
      {
        id: 'shortcuts-help',
        group: 'Settings',
        label: 'Keyboard shortcuts',
        icon: Keyboard,
        keywords: 'shortcuts keys hotkey help command',
        action: () => openKeyboardShortcutsModal(),
      },
      {
        id: 'settings-mcp',
        group: 'Settings',
        label: 'Copy MCP server URL',
        icon: Copy,
        action: () => {
          const url = getMcpServerUrl();
          if (!url) {
            toast.error('Set VITE_SUPABASE_URL in your environment.');
            return;
          }
          void navigator.clipboard.writeText(url);
          toast.success('Copied to clipboard');
        },
      }
    );

    return list;
  }, [
    navigate,
    toggleSidebar,
    openCreateCollectionModal,
    openCollectionEditModal,
    openCollectionDeleteDialog,
    setFiltersPopoverOpen,
    openRow,
    collections,
    activeCollection,
    onCollectionPage,
    collectionId,
    routeSlug,
    fields,
    activeView,
    createView,
    updateView,
    createRow,
    openKeyboardShortcutsModal,
  ]);
}
