/** Preset collection accent colors (12 swatches for ColorPicker). */
export const COLLECTION_COLORS = [
  '#e05252',
  '#e07842',
  '#d4a847',
  '#52a869',
  '#3d9e8c',
  '#4a7ce0',
  '#8b5cf6',
  '#d45c8a',
  '#666666',
  '#2e2e2e',
  '#888888',
  '#e8e8e8',
] as const;

export type CollectionColor = (typeof COLLECTION_COLORS)[number];
