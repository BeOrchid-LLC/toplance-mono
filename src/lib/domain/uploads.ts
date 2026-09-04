/**
 * What the product accepts as a document, in one place.
 *
 * These three facts have to agree or the product lies to the traveller:
 * the `accept` attribute on the picker decides what they can choose, the
 * size check in `uploadDocument` decides what is refused after they
 * have chosen, and the guidance on the documents page tells them both
 * before they start. They lived in three files and were already drifting
 * — the page said nothing at all, so the 10MB rule was discoverable only
 * by hitting it.
 *
 * `ACCEPT` is deliberately wider than the pre-check understands.
 * `precheckSupports` covers JPEG, PNG, WebP and PDF; a phone handing us
 * HEIC still uploads, and a human reviews it with no AI opinion. Telling
 * travellers only about the formats the machine can read would refuse
 * files the product accepts perfectly well.
 */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** The size as a person reads it, for both the guidance and the error. */
export const MAX_UPLOAD_LABEL = "10MB";

/** The picker's filter, on the camera and the file input alike. */
export const ACCEPT = "image/*,application/pdf";

/** The formats worth naming to a traveller, in their own words. */
export const ACCEPTED_LABEL = "JPG, PNG, HEIC or PDF";

/**
 * The one sentence that has to reach a traveller before they photograph
 * a passport on a kitchen table. Legibility is the single largest cause
 * of a re-upload, and it is entirely within their control at the moment
 * they take the picture — afterwards it costs them a round trip.
 */
export const UPLOAD_GUIDANCE = `Upload a clear, high-resolution image or PDF — a blurred, cropped or dark file cannot be read and will be sent back. ${ACCEPTED_LABEL}, up to ${MAX_UPLOAD_LABEL} each.`;
