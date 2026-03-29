import { toast } from 'sonner';

function messageFromUnknown(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const m = (error as { message?: string }).message;
    if (typeof m === 'string' && m.trim()) return m;
  }
  if (error instanceof Error) return error.message || 'Unknown error';
  return 'Unknown error';
}

export function toastMutationError(error: unknown): void {
  toast.error('Something went wrong', { description: messageFromUnknown(error) });
}
