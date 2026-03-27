import { FolderX } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  CustomViewEditor,
  type CustomViewEditorHandle,
  type CustomViewEditorSavePayload,
} from '@/components/views/CustomView/CustomViewEditor';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton';
import { useCollection } from '@/hooks/useCollections';
import { useFields } from '@/hooks/useFields';
import {
  useAssignCustomView,
  useCreateCustomView,
  useCustomView,
  useUpdateCustomView,
} from '@/hooks/useCustomViews';

export function CustomViewEditorPage() {
  const { slug, customViewId } = useParams<{ slug: string; customViewId?: string }>();
  const navigate = useNavigate();
  const isNew = !customViewId;

  const editorRef = useRef<CustomViewEditorHandle>(null);
  const [dirty, setDirty] = useState(false);

  const { data: collection, isLoading: collectionLoading, isError, isFetched } = useCollection(slug ?? '');
  const collectionId = collection?.id ?? '';
  const { data: fields = [], isLoading: fieldsLoading } = useFields(collectionId);
  const { data: registryRow, isLoading: registryLoading } = useCustomView(isNew ? undefined : customViewId);

  const createCustom = useCreateCustomView();
  const updateCustom = useUpdateCustomView();
  const assignCustom = useAssignCustomView();

  const hydration = useMemo(() => {
    if (isNew || !registryRow) return null;
    return {
      code: registryRow.code,
      compiledCode: registryRow.compiled_code,
      name: registryRow.name,
    };
  }, [isNew, registryRow]);

  useEffect(() => {
    if (!dirty || isNew) return;
    const id = window.setInterval(() => {
      void editorRef.current?.save('auto');
    }, 30_000);
    return () => clearInterval(id);
  }, [dirty, isNew]);

  const handleSave = async (payload: CustomViewEditorSavePayload) => {
    if (!collection || !slug) return;
    if (isNew) {
      const created = await createCustom.mutateAsync({
        name: payload.name,
        description: null,
        code: payload.code,
        compiled_code: payload.compiledCode,
      });
      const viewId = await assignCustom.mutateAsync({
        customViewId: created.id,
        collectionId: collection.id,
      });
      navigate(`/c/${slug}?view=${viewId}`, { replace: true });
      return;
    }
    if (!customViewId) return;
    await updateCustom.mutateAsync({
      id: customViewId,
      name: payload.name,
      code: payload.code,
      compiled_code: payload.compiledCode,
    });
  };

  if (!slug) {
    return null;
  }

  if (collectionLoading) {
    return (
      <div className="flex min-h-[calc(100vh-48px)] flex-col gap-4 p-8">
        <Skeleton className="h-10 w-64 rounded-kern-md" />
        <SkeletonText className="max-w-md" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8">
        <EmptyState
          icon={FolderX}
          title="Something went wrong"
          subtitle="Could not load this collection."
          actionLabel="Back to dashboard"
          onAction={() => navigate('/dashboard')}
        />
      </div>
    );
  }

  if (isFetched && collection === null) {
    return (
      <div className="p-8">
        <EmptyState
          icon={FolderX}
          title="Collection not found"
          subtitle="It may have been deleted or you may not have access."
          actionLabel="Back to dashboard"
          onAction={() => navigate('/dashboard')}
        />
      </div>
    );
  }

  if (!collection) {
    return null;
  }

  if (!isNew && registryLoading) {
    return (
      <div className="flex min-h-[calc(100vh-48px)] flex-col gap-4 p-8">
        <Skeleton className="h-10 w-64 rounded-kern-md" />
        <SkeletonText className="max-w-lg" />
      </div>
    );
  }

  if (!isNew && !registryRow) {
    return (
      <div className="p-8">
        <EmptyState
          icon={FolderX}
          title="Custom view not found"
          subtitle="This view may have been deleted."
          actionLabel="Back to collection"
          onAction={() => navigate(`/c/${slug}`)}
        />
      </div>
    );
  }

  if (fieldsLoading) {
    return (
      <div className="flex min-h-[calc(100vh-48px)] flex-col gap-4 p-8">
        <Skeleton className="h-10 w-64 rounded-kern-md" />
      </div>
    );
  }

  return (
    <CustomViewEditor
      ref={editorRef}
      key={isNew ? 'new' : customViewId}
      collectionId={collection.id}
      collectionName={collection.name}
      collectionSlug={slug}
      fields={fields}
      hydration={hydration}
      onSave={handleSave}
      onDirtyChange={setDirty}
      allowAutosave={!isNew}
    />
  );
}
