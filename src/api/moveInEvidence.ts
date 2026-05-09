import * as FileSystem from 'expo-file-system/legacy';

import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../config/constants';
import { supabase } from '../lib/supabase';

export const MOVE_IN_BUCKET = 'move-in-evidence';

export type EvidenceSlotId =
  | 'living_room'
  | 'kitchen'
  | 'bedroom'
  | 'bathroom'
  | 'exterior';

export interface EvidenceSlotMeta {
  id: EvidenceSlotId;
  label: string;
  description: string;
}

export const EVIDENCE_SLOTS: EvidenceSlotMeta[] = [
  {
    id: 'living_room',
    label: 'LIVING ROOM',
    description: 'Wide shot of the entire room with walls + floor visible.',
  },
  {
    id: 'kitchen',
    label: 'KITCHEN',
    description: 'Counter, sink, appliances, and any pre-existing damage.',
  },
  {
    id: 'bedroom',
    label: 'BEDROOM',
    description: 'Walls, flooring, ceiling, and built-in fixtures.',
  },
  {
    id: 'bathroom',
    label: 'BATHROOM',
    description: 'Tiles, fittings, sanitary ware, and water stains.',
  },
  {
    id: 'exterior',
    label: 'ENTRANCE',
    description: 'Front door, lock, doorframe, and the exterior corridor.',
  },
];

export interface EvidenceUpload {
  slot: EvidenceSlotId;
  fileUri: string;
  mimeType: string;
  capturedAt: number;
  latitude: number | null;
  longitude: number | null;
  accuracyMeters: number | null;
}

export interface EvidenceRecord {
  id: string;
  mobile_number: string;
  slot: EvidenceSlotId;
  storage_path: string;
  image_url: string;
  mime_type: string | null;
  captured_at: string;
  latitude: number | null;
  longitude: number | null;
  accuracy_meters: number | null;
  created_at?: string;
}

export class MoveInEvidenceError extends Error {
  readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'MoveInEvidenceError';
    this.cause = cause;
  }
}

function extensionFromMime(mime: string): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  if (mime === 'image/heic' || mime === 'image/heif') return 'heic';
  return 'jpg';
}

function buildStoragePath(
  mobileNumber: string,
  slot: EvidenceSlotId,
  capturedAt: number,
  mimeType: string,
): string {
  const safeMobile = mobileNumber.replace(/[^\d+]/g, '') || 'unknown';
  const ext = extensionFromMime(mimeType);
  return `${safeMobile}/${slot}-${capturedAt}.${ext}`;
}

async function streamUpload(
  path: string,
  fileUri: string,
  mimeType: string,
): Promise<void> {
  const endpoint = `${SUPABASE_URL}/storage/v1/object/${MOVE_IN_BUCKET}/${path}`;
  const result = await FileSystem.uploadAsync(endpoint, fileUri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
      'x-upsert': 'true',
      'Content-Type': mimeType,
      'Cache-Control': '3600',
    },
  });

  if (result.status < 200 || result.status >= 300) {
    let detail = result.body || `HTTP ${result.status}`;
    try {
      const parsed = JSON.parse(result.body || '{}');
      if (parsed?.message) detail = parsed.message;
    } catch {
      // body wasn't JSON; keep raw text
    }
    throw new MoveInEvidenceError(
      `Storage upload failed (${result.status}): ${detail}`,
    );
  }
}

async function uploadOne(
  mobileNumber: string,
  upload: EvidenceUpload,
): Promise<EvidenceRecord> {
  const path = buildStoragePath(
    mobileNumber,
    upload.slot,
    upload.capturedAt,
    upload.mimeType,
  );

  await streamUpload(path, upload.fileUri, upload.mimeType);

  const { data: signed, error: signError } = await supabase.storage
    .from(MOVE_IN_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  if (signError || !signed?.signedUrl) {
    throw new MoveInEvidenceError(
      `Could not sign URL for ${upload.slot}: ${
        signError?.message ?? 'unknown error'
      }`,
      signError,
    );
  }

  const row = {
    mobile_number: mobileNumber,
    slot: upload.slot,
    storage_path: path,
    image_url: signed.signedUrl,
    mime_type: upload.mimeType,
    captured_at: new Date(upload.capturedAt).toISOString(),
    latitude: upload.latitude,
    longitude: upload.longitude,
    accuracy_meters: upload.accuracyMeters,
  };

  const { data: inserted, error: insertError } = await supabase
    .from('move_in_evidence')
    .upsert(row, { onConflict: 'mobile_number,slot' })
    .select()
    .single();

  if (insertError || !inserted) {
    throw new MoveInEvidenceError(
      `Failed to record ${upload.slot}: ${
        insertError?.message ?? 'unknown error'
      }`,
      insertError,
    );
  }

  return inserted as EvidenceRecord;
}

export async function submitMoveInEvidence(
  mobileNumber: string,
  uploads: EvidenceUpload[],
): Promise<EvidenceRecord[]> {
  if (!mobileNumber) {
    throw new MoveInEvidenceError('Mobile number is required.');
  }
  if (uploads.length === 0) {
    throw new MoveInEvidenceError('No evidence to submit.');
  }

  const results: EvidenceRecord[] = [];
  for (const upload of uploads) {
    const record = await uploadOne(mobileNumber, upload);
    results.push(record);
  }
  return results;
}

export async function fetchMoveInEvidence(
  mobileNumber: string,
): Promise<EvidenceRecord[]> {
  if (!mobileNumber) return [];
  const { data, error } = await supabase
    .from('move_in_evidence')
    .select(
      'id, mobile_number, slot, storage_path, image_url, mime_type, captured_at, latitude, longitude, accuracy_meters, created_at',
    )
    .eq('mobile_number', mobileNumber)
    .order('captured_at', { ascending: true });

  if (error) {
    throw new MoveInEvidenceError(error.message, error);
  }

  return (data ?? []) as EvidenceRecord[];
}

export async function refreshSignedUrls(
  records: EvidenceRecord[],
  expiresIn: number = 60 * 60 * 24 * 365,
): Promise<EvidenceRecord[]> {
  return Promise.all(
    records.map(async (record) => {
      const { data, error } = await supabase.storage
        .from(MOVE_IN_BUCKET)
        .createSignedUrl(record.storage_path, expiresIn);
      if (error || !data?.signedUrl) return record;
      return { ...record, image_url: data.signedUrl };
    }),
  );
}
