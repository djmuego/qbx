import type { CropProfile } from '../../domain/grow/crop-profile.types';
import type { GrowContext } from '../../domain/ai/grow-context.types';

const STORAGE_KEY = 'qbx_crop_profile_v1';

function key(spaceId: string) {
  return `${STORAGE_KEY}_${spaceId}`;
}

export function loadCropProfile(spaceId: string): CropProfile | null {
  if (!spaceId || typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key(spaceId));
    return raw ? (JSON.parse(raw) as CropProfile) : null;
  } catch {
    return null;
  }
}

export function saveCropProfile(spaceId: string, profile: CropProfile): void {
  if (!spaceId || typeof window === 'undefined') return;
  localStorage.setItem(key(spaceId), JSON.stringify(profile));
  void import('./ai-cloud.persistence').then((m) => m.cloudSaveCropProfile(spaceId, profile));
}

export function clearCropProfile(spaceId: string): void {
  if (!spaceId || typeof window === 'undefined') return;
  localStorage.removeItem(key(spaceId));
  void import('./ai-cloud.persistence').then((m) => m.cloudClearCropProfile(spaceId));
}

export function createCropProfile(cropId: string, commonName: string): CropProfile {
  return {
    cropId,
    commonName,
    startedAt: new Date().toISOString().slice(0, 10),
  };
}
