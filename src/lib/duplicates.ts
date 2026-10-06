import type { UploadedFile } from './types';

/** Groups usable files by identical SHA-256; returns only groups with 2+ files, in upload order. */
export function duplicateGroups(files: UploadedFile[]): UploadedFile[][] {
  const byHash = new Map<string, UploadedFile[]>();
  for (const f of files) {
    if (f.error || !f.hash) continue;
    byHash.set(f.hash, [...(byHash.get(f.hash) ?? []), f]);
  }
  return [...byHash.values()].filter((g) => g.length > 1);
}

/** fileId → another file with the same content (every member of a group gets an entry). */
export function duplicateOf(files: UploadedFile[]): Record<string, UploadedFile> {
  const out: Record<string, UploadedFile> = {};
  for (const g of duplicateGroups(files)) for (const f of g) out[f.id] = g.find((x) => x !== f)!;
  return out;
}
