/**
 * What counts as a profile photo, decided away from the server action so
 * the rules are testable without a Clerk session — the same split
 * `corridor-gap` makes for the requirements copy.
 *
 * Formats a browser can both produce and render: JPEG, PNG, WebP. SVG is
 * excluded on purpose — it is markup, not a photo, and the bucket also
 * holds passport scans.
 */
const AVATAR_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

/** Null when the file is acceptable, otherwise the sentence to show. */
export function validateAvatarFile(type: string, size: number): string | null {
  if (size === 0) return "Choose a photo first.";
  if (!AVATAR_TYPES[type]) {
    return "That file is not a photo we can use — JPEG, PNG or WebP.";
  }
  if (size > AVATAR_MAX_BYTES) {
    return "That photo is over 5MB. Try a smaller one.";
  }
  return null;
}

/**
 * The object key for one upload: namespaced by user (the guard is the
 * session, so the folder matches it) and stamped so a replacement never
 * reuses the old key — the previous object is deleted only after the row
 * points at the new one, same order as document uploads.
 */
export function avatarKey(userId: string, type: string, now: number): string {
  return `avatars/${userId}/${now}.${AVATAR_TYPES[type]}`;
}
