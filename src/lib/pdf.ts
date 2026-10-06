// Browser-only pdfjs setup. Everything runs locally; nothing is uploaded.
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { PageCounter } from './files';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

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
