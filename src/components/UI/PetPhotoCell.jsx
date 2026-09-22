import { assetUrl, PET_PHOTO_KIND_LABEL } from '../../lib/assets.js';

// One small thumbnail for a single photo kind (Front / Left / Right) in a list
// row. Clicking it opens the full-size image in a new tab — no need to open
// the record to check a photo. Shows a muted dash when that kind is missing.
export default function PetPhotoCell({ photos, kind }) {
  const photo = (photos || []).find((p) => p.kind === kind);
  if (!photo) return <span className="text-brand-slate/50">—</span>;
  return (
    <a
      href={assetUrl(photo.url)}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      title={`Open ${PET_PHOTO_KIND_LABEL[kind] || kind} photo`}
      className="inline-block"
    >
      <img
        src={assetUrl(photo.url)}
        alt={PET_PHOTO_KIND_LABEL[kind] || kind}
        className="h-16 w-16 rounded-lg border border-brand-line object-cover transition-transform hover:scale-110 hover:shadow-card"
      />
    </a>
  );
}
