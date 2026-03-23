import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

export interface FileAttachment {
  path: string;
  name: string;
  size: number;
  type: string;
}

const signedUrlCache = new Map<string, { url: string; expiry: number }>();

export function asFileAttachments(value: unknown): FileAttachment[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (x): x is FileAttachment =>
      x !== null &&
      typeof x === 'object' &&
      typeof (x as FileAttachment).path === 'string' &&
      typeof (x as FileAttachment).name === 'string'
  );
}

export async function getFileUrl(path: string): Promise<string> {
  const cached = signedUrlCache.get(path);
  if (cached && cached.expiry > Date.now() + 60_000) return cached.url;
  const { data, error } = await supabase.storage.from('kern-files').createSignedUrl(path, 3600);
  if (error || !data) throw error ?? new Error('Signed URL failed');
  signedUrlCache.set(path, { url: data.signedUrl, expiry: Date.now() + 3600_000 });
  return data.signedUrl;
}

export function useFileUrl(path: string | null) {
  return useQuery({
    queryKey: ['file-url', path],
    queryFn: () => getFileUrl(path!),
    enabled: Boolean(path),
    staleTime: 3_300_000,
  });
}

export function useFileUpload() {
  const { user } = useAuth();

  async function uploadFile(file: File, collectionId: string, rowId: string): Promise<FileAttachment> {
    if (!user) throw new Error('Not signed in');
    const ext = file.name.includes('.') ? file.name.split('.').pop() : '';
    const safeExt = ext ? ext.replace(/[^\w.-]/g, '') : 'bin';
    const path = `${user.id}/${collectionId}/${rowId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExt}`;
    const { error } = await supabase.storage.from('kern-files').upload(path, file, { upsert: false });
    if (error) throw error;
    return { path, name: file.name, size: file.size, type: file.type || 'application/octet-stream' };
  }

  async function deleteFile(path: string): Promise<void> {
    const { error } = await supabase.storage.from('kern-files').remove([path]);
    if (error) throw error;
    signedUrlCache.delete(path);
  }

  return { uploadFile, getFileUrl, deleteFile };
}
