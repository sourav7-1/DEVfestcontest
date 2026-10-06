// Browser-only pdfjs setup. Everything runs locally; nothing is uploaded.
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { PageCounter } from './files';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

/** Renders the first `max` pages as PNG data URLs (thumbnail width ~`width` px), one at a time via `onPage`. */
export async function renderThumbnails(bytes: Uint8Array, max: number, width: number, onPage: (url: string, i: number, total: number) => void, signal: { cancelled: boolean }) {
  const task = pdfjs.getDocument({ data: bytes.slice(), verbosity: 0 });
  try {
    const doc = await task.promise;
    for (let i = 1; i <= Math.min(max, doc.numPages) && !signal.cancelled; i++) {
      const page = await doc.getPage(i);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: (width * (window.devicePixelRatio || 1)) / base.width });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvas, viewport }).promise;
      if (!signal.cancelled) onPage(canvas.toDataURL('image/png'), i, doc.numPages);
    }
    return doc.numPages;
  } finally {
    void task.destroy();
  }
}

export const countPages: PageCounter = async (bytes) => {
  // pdfjs transfers the buffer to its worker, so hand it a copy.
  const task = pdfjs.getDocument({ data: bytes.slice(), verbosity: 0 });
  try {
    const doc = await task.promise;
    return doc.numPages;
  } catch (e) {
    return (e as { name?: string })?.name === 'PasswordException' ? 'encrypted' : 'corrupt';
  } finally {
    void task.destroy();
  }
};
