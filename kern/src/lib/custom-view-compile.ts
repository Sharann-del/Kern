import { transform } from '@babel/standalone';

export async function compileCustomViewSource(
  sourceCode: string
): Promise<{ code: string | null; error: string | null }> {
  try {
    const result = transform(sourceCode, {
      presets: [
        ['typescript', { isTSX: true, allExtensions: true }],
        ['react', { runtime: 'classic' }],
      ],
      plugins: [['transform-modules-commonjs', { loose: true }]],
      filename: 'custom-view.tsx',
    });
    return { code: result.code ?? null, error: null };
  } catch (err) {
    return { code: null, error: String(err) };
  }
}
