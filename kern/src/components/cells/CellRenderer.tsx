import type { CellComponentProps } from '@/components/cells/types';
import { BooleanCell } from '@/components/cells/BooleanCell';
import { DateCell } from '@/components/cells/DateCell';
import { EmailCell } from '@/components/cells/EmailCell';
import { FileCell } from '@/components/cells/FileCell';
import { MultiSelectCell } from '@/components/cells/MultiSelectCell';
import { NumberCell } from '@/components/cells/NumberCell';
import { PhoneCell } from '@/components/cells/PhoneCell';
import { RelationCell } from '@/components/cells/RelationCell';
import { RichTextCell } from '@/components/cells/RichTextCell';
import { SelectCell } from '@/components/cells/SelectCell';
import { TextCell } from '@/components/cells/TextCell';
import { UrlCell } from '@/components/cells/UrlCell';
import { memo } from 'react';

function CellRendererInner(props: CellComponentProps) {
  switch (props.field.type) {
    case 'text':
      return <TextCell {...props} />;
    case 'rich_text':
      return <RichTextCell {...props} />;
    case 'number':
      return <NumberCell {...props} />;
    case 'date':
    case 'datetime':
      return <DateCell {...props} />;
    case 'boolean':
      return <BooleanCell {...props} />;
    case 'select':
      return <SelectCell {...props} />;
    case 'multi_select':
      return <MultiSelectCell {...props} />;
    case 'url':
      return <UrlCell {...props} />;
    case 'email':
      return <EmailCell {...props} />;
    case 'phone':
      return <PhoneCell {...props} />;
    case 'relation':
      return <RelationCell {...props} />;
    case 'file':
      return <FileCell {...props} />;
    default:
      return <TextCell {...props} />;
  }
}

function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null) {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }
  return false;
}

function relationTargetIds(row: CellComponentProps['row'], slug: string): string {
  const rel = row.relations?.[slug];
  if (rel?.length) return rel.map((r) => r.id).join('\0');
  return '';
}

function areCellPropsEqual(a: CellComponentProps, b: CellComponentProps): boolean {
  if (a.rowId !== b.rowId) return false;
  if (a.field.id !== b.field.id) return false;
  if (a.isEditing !== b.isEditing) return false;
  if (a.field.type !== b.field.type) return false;
  if (!sameValue(a.value, b.value)) return false;
  if (a.field.type === 'relation') {
    return relationTargetIds(a.row, a.field.slug) === relationTargetIds(b.row, b.field.slug);
  }
  return true;
}

export const CellRenderer = memo(CellRendererInner, areCellPropsEqual);
