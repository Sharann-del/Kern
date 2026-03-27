declare module '@babel/standalone' {
  type PresetOrPlugin =
    | string
    | [string, Record<string, unknown>];

  export function transform(
    code: string,
    options?: {
      presets?: PresetOrPlugin[];
      plugins?: PresetOrPlugin[];
      filename?: string;
    }
  ): { code?: string | null };
}
