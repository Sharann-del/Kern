import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

import { useCollectionById } from '@/hooks/useCollections';
import { useFields } from '@/hooks/useFields';
import { useRows } from '@/hooks/useRows';
import { useViews } from '@/hooks/useViews';
import { rowPrimaryLabel } from '@/lib/rowDisplay';

export type ViewEmbedWidgetProps = {
  config: { collection_id: string; view_id: string };
};

export function ViewEmbedWidget({ config }: ViewEmbedWidgetProps) {
  const { data: collection } = useCollectionById(config.collection_id);
  const { data: views = [], isLoading: viewsLoading } = useViews(config.collection_id);
  const view = views.find((v) => v.id === config.view_id);
  const { data: fields = [], isLoading: fieldsLoading } = useFields(config.collection_id);
  const { data: rows = [], isLoading: rowsLoading } = useRows(
    config.collection_id,
    view?.config,
    fields
  );

  if (viewsLoading || fieldsLoading || rowsLoading) {
    return <p className="text-xs text-kern-text-3">Loading…</p>;
  }

  if (!view) {
    return <p className="text-xs text-kern-text-3">View not found.</p>;
  }

  const list = rows.slice(0, 12);
  const href =
    collection?.slug != null
      ? `/c/${collection.slug}?view=${encodeURIComponent(view.id)}`
      : '#';

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <p className="text-xs text-kern-text-2">{view.name}</p>
      <ul className="min-h-0 flex-1 space-y-1 overflow-auto">
        {list.map((row) => (
          <li
            key={row.id}
            className="truncate rounded-kern-md px-2 py-1 text-sm text-kern-text"
          >
            <span className="font-medium">{rowPrimaryLabel(row, fields)}</span>
            <span className="ml-2 text-xs text-kern-text-3">
              {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
            </span>
          </li>
        ))}
      </ul>
      {list.length === 0 ? <p className="text-xs text-kern-text-3">No rows in this view.</p> : null}
      {collection?.slug ? (
        <Link
          to={href}
          className="text-xs font-medium text-kern-accent hover:underline"
        >
          Open view →
        </Link>
      ) : null}
    </div>
  );
}
