/**
 * What counts as an agency logo, decided away from the server action so
 * the rules are testable without a session — the same split
 * `@/lib/domain/avatar` makes for a profile photo.
 *
 * The same three raster formats, and SVG excluded for the same reason:
 * it is markup, not a picture, and this bucket also holds passport
 * scans. A logo is rendered into the rail of every console page, where
 * an inline `<svg>` from an uploaded file would be script the product
 * did not write.
 *
 * The ceiling is lower than an avatar's. A wordmark is a wide strip
 * roughly 200×28 on screen; anything approaching 5MB is a print asset
 * somebody dragged in by mistake, and telling them so at the upload is
 * kinder than letting every page of their console carry it.
 */
const LOGO_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const LOGO_MAX_BYTES = 2 * 1024 * 1024;

/** Null when the file is acceptable, otherwise the sentence to show. */
export function validateLogoFile(type: string, size: number): string | null {
  if (size === 0) return "Choose a logo first.";
  if (!LOGO_TYPES[type]) {
    return "That file is not an image we can use — JPEG, PNG or WebP.";
  }
  if (size > LOGO_MAX_BYTES) {
    return "That image is over 2MB. Try a smaller one.";
  }
  return null;
}

/**
 * The object key for one upload: namespaced by organisation rather than
 * by the person who uploaded it, because the logo belongs to the agency
 * and outlives whichever director put it there. Stamped so a replacement
 * never reuses the old key — the previous object is deleted only after
 * the row points at the new one, the same order document and avatar
 * uploads use.
 */
export function orgLogoKey(orgId: string, type: string, now: number): string {
  return `logos/${orgId}/${now}.${LOGO_TYPES[type]}`;
}
