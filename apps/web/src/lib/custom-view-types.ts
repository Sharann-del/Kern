/**
 * Injected into Monaco for custom-view IntelliSense.
 * Preview compiles to CommonJS and provides require() for `react` and `recharts` only.
 * `dateFns` is typings-only unless the iframe sandbox loads a date-fns global (see CustomViewRenderer).
 */
export const KERN_VIEW_TYPES_DTS = `declare module 'kern' {
  export interface KernRow { id: string; data: Record<string, unknown>; created_at: string; updated_at: string; }
  export interface SelectOption { id: string; label: string; color: string; }
  export interface KernField { id: string; name: string; slug: string; type: string; options: any; is_primary: boolean; }
  export interface KernViewProps {
    rows: KernRow[];
    fields: KernField[];
    collectionName: string;
    onRowUpdate(rowId: string, data: Record<string, unknown>): Promise<void>;
    onRowCreate(data: Record<string, unknown>): Promise<void>;
    onRowDelete(rowId: string): Promise<void>;
    onRowClick(rowId: string): void;
  }
}

declare const rows: import('kern').KernRow[];
declare const fields: import('kern').KernField[];
declare const collectionName: string;
declare const onRowUpdate: (rowId: string, data: Record<string, unknown>) => Promise<void>;
declare const onRowCreate: (data: Record<string, unknown>) => Promise<void>;
declare const onRowDelete: (rowId: string) => Promise<void>;
declare const onRowClick: (rowId: string) => void;

declare const Recharts: typeof import('recharts');
declare const dateFns: {
  format: Function;
  parseISO: Function;
  differenceInDays: Function;
  addDays: Function;
  startOfWeek: Function;
  startOfMonth: Function;
};
`;
