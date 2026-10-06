import type { FileError, UploadedFile } from './types';

export const MAX_FILES = 30;
export const MAX_TOTAL_BYTES = 50 * 1024 * 1024;

/** Real PDF check: "%PDF-" within the first 1024 bytes (what PDF readers accept). Extension/MIME are ignored. */
export function isPdfHeader(bytes: Uint8Array): boolean {
  const head = bytes.subarray(0, 1024);
  for (let i = 0; i + 5 <= head.length; i++) {
    if (head[i] === 0x25 && head[i + 1] === 0x50 && head[i + 2] === 0x44 && head[i + 3] === 0x46 && head[i + 4] === 0x2d) return true;
  }
  return false;
}

export async function sha256(bytes: Uint8Array): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', bytes as Uint8Array<ArrayBuffer>);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Splits incoming files into those that fit the limits and those that don't.
 * Only accepted (error-free) files count toward the limits.
 */
export function applyLimits<T extends { size: number }>(
  existing: { size: number; error?: FileError }[],
  incoming: T[],
): { accepted: T[]; overLimit: T[]; reason?: 'count' | 'size' } {
  const ok = existing.filter((f) => !f.error);
  let count = ok.length;
  let total = ok.reduce((s, f) => s + f.size, 0);
  const accepted: T[] = [];
  const overLimit: T[] = [];
  let reason: 'count' | 'size' | undefined;
  for (const f of incoming) {
    if (count + 1 > MAX_FILES) { overLimit.push(f); reason ??= 'count'; continue; }
    if (total + f.size > MAX_TOTAL_BYTES) { overLimit.push(f); reason ??= 'size'; continue; }
    count++;
    total += f.size;
    accepted.push(f);
  }
  return { accepted, overLimit, reason };
}

/** Returns page count, or a FileError for unreadable PDFs. Injected so this module stays Node-testable. */
export type PageCounter = (bytes: Uint8Array) => Promise<number | 'corrupt' | 'encrypted'>;

let seq = 0;
export const newId = () => `f${Date.now().toString(36)}${(seq++).toString(36)}`;

/** Reads one file into an UploadedFile. Never throws: problems become `error`. */
export async function readUpload(
  file: { name: string; size: number; arrayBuffer(): Promise<ArrayBuffer> },
  countPages: PageCounter,
): Promise<UploadedFile> {
  const base = { id: newId(), name: file.name, size: file.size, pageCount: 0, hash: '' };
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    return { ...base, bytes: new Uint8Array(), error: 'corrupt' };
  }
  const hash = await sha256(bytes);
  if (!isPdfHeader(bytes)) return { ...base, bytes, hash, error: 'not_pdf' };
  let pages: Awaited<ReturnType<PageCounter>>;
  try {
    pages = await countPages(bytes);
  } catch {
    pages = 'corrupt';
  }
  if (typeof pages !== 'number') return { ...base, bytes, hash, error: pages };
  if (pages < 1) return { ...base, bytes, hash, error: 'corrupt' };
  return { ...base, bytes, hash, pageCount: pages };
}

export function formatSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
