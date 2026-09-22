import { BASE_URL } from '../api/axios.js';

// Uploaded photo paths come back as server-relative ("/uploads/…"); the API
// itself is mounted under "/api", so strip that to get the file host.
const ASSET_BASE = BASE_URL.replace(/\/api\/?$/, '');

export function assetUrl(u) {
  return u && /^https?:/.test(u) ? u : `${ASSET_BASE}${u || ''}`;
}

export const PET_PHOTO_KINDS = ['FRONT', 'LEFT', 'RIGHT'];
export const PET_PHOTO_KIND_LABEL = { FRONT: 'Front', LEFT: 'Left', RIGHT: 'Right' };
