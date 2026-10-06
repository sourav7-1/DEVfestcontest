export type Lang = 'en' | 'bn';

export interface Requirement {
  id: string;
  order: number;
  title_en: string;
  title_bn: string;
  mandatory: boolean;
  expiry_required: boolean;
}

export interface Tender {
  tender_id: string;
  title: string;
  procuring_entity: string;
  bidder: string;
  /** YYYY-MM-DD */
  deadline: string;
}

export type FileError = 'not_pdf' | 'corrupt' | 'encrypted' | 'limit';

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  bytes: Uint8Array;
  pageCount: number;
  hash: string;
  error?: FileError;
}

// Plain object (not a TS enum) so src/lib runs in Node with type stripping.
export const Status = {
  OK: 'ok',
  Missing: 'missing',
  Expired: 'expired',
  ExpiryNeeded: 'expiry_needed',
  NotProvided: 'not_provided',
  Duplicate: 'duplicate',
  Error: 'error',
} as const;
export type Status = (typeof Status)[keyof typeof Status];
