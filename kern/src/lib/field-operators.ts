import type { FieldType, FilterOperator } from '@/types/kern';

export type FieldOperatorOption = { operator: FilterOperator; label: string };

export const OPERATORS_BY_FIELD_TYPE: Record<FieldType, FieldOperatorOption[]> = {
  text: [
    { operator: 'contains', label: 'Contains' },
    { operator: 'not_contains', label: 'Does not contain' },
    { operator: 'eq', label: 'Equals' },
    { operator: 'neq', label: 'Does not equal' },
    { operator: 'starts_with', label: 'Starts with' },
    { operator: 'ends_with', label: 'Ends with' },
    { operator: 'is_empty', label: 'Is empty' },
    { operator: 'is_not_empty', label: 'Is not empty' },
  ],
  rich_text: [
    { operator: 'contains', label: 'Contains' },
    { operator: 'not_contains', label: 'Does not contain' },
    { operator: 'eq', label: 'Equals' },
    { operator: 'neq', label: 'Does not equal' },
    { operator: 'starts_with', label: 'Starts with' },
    { operator: 'ends_with', label: 'Ends with' },
    { operator: 'is_empty', label: 'Is empty' },
    { operator: 'is_not_empty', label: 'Is not empty' },
  ],
  number: [
    { operator: 'eq', label: 'Equals' },
    { operator: 'neq', label: 'Does not equal' },
    { operator: 'gt', label: 'Greater than' },
    { operator: 'lt', label: 'Less than' },
    { operator: 'gte', label: 'Greater or equal' },
    { operator: 'lte', label: 'Less or equal' },
    { operator: 'is_empty', label: 'Is empty' },
    { operator: 'is_not_empty', label: 'Is not empty' },
  ],
  date: [
    { operator: 'eq', label: 'Equals' },
    { operator: 'before', label: 'Before' },
    { operator: 'after', label: 'After' },
    { operator: 'gte', label: 'On or after' },
    { operator: 'lte', label: 'On or before' },
    { operator: 'is_empty', label: 'Is empty' },
    { operator: 'is_not_empty', label: 'Is not empty' },
  ],
  datetime: [
    { operator: 'eq', label: 'Equals' },
    { operator: 'before', label: 'Before' },
    { operator: 'after', label: 'After' },
    { operator: 'gte', label: 'On or after' },
    { operator: 'lte', label: 'On or before' },
    { operator: 'is_empty', label: 'Is empty' },
    { operator: 'is_not_empty', label: 'Is not empty' },
  ],
  boolean: [{ operator: 'is_true', label: 'Is true' }, { operator: 'is_false', label: 'Is false' }],
  select: [
    { operator: 'eq', label: 'Equals' },
    { operator: 'neq', label: 'Does not equal' },
    { operator: 'is_empty', label: 'Is empty' },
    { operator: 'is_not_empty', label: 'Is not empty' },
  ],
  multi_select: [
    { operator: 'contains', label: 'Contains' },
    { operator: 'not_contains', label: 'Does not contain' },
    { operator: 'is_empty', label: 'Is empty' },
    { operator: 'is_not_empty', label: 'Is not empty' },
  ],
  url: [
    { operator: 'contains', label: 'Contains' },
    { operator: 'is_empty', label: 'Is empty' },
    { operator: 'is_not_empty', label: 'Is not empty' },
  ],
  email: [
    { operator: 'contains', label: 'Contains' },
    { operator: 'is_empty', label: 'Is empty' },
    { operator: 'is_not_empty', label: 'Is not empty' },
  ],
  phone: [
    { operator: 'contains', label: 'Contains' },
    { operator: 'is_empty', label: 'Is empty' },
    { operator: 'is_not_empty', label: 'Is not empty' },
  ],
  relation: [{ operator: 'is_empty', label: 'Is empty' }, { operator: 'is_not_empty', label: 'Is not empty' }],
  file: [{ operator: 'is_empty', label: 'Is empty' }, { operator: 'is_not_empty', label: 'Is not empty' }],
};
