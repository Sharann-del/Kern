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

export const CellRenderer = memo(CellRendererInner);
