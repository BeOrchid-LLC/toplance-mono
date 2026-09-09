/**
 * What the auth doors say when Clerk refuses.
 *
 * Clerk's Future API resolves with `{ error }` rather than throwing, and
 * that error carries `code` plus an *optional* `longMessage` — see
 * `FieldError` in `@clerk/shared`. `longMessage` is the string Clerk
 * intends for users; `message` is for developers and is explicitly not
 * stable. Reading `longMessage ?? fallback` and nothing else, which is
 * what the form did, has two failure modes and both were live:
 *
 *  - **Clerk omits it.** Every distinct refusal then collapses into one
 *    generic sentence. A director who had already signed up was told
 *    "We could not send a code to that address. Check it and try again."
 *    — which names the wrong step, blames an address that was correct,
 *    and offers no way forward. That is the bug this module fixes.
 *  - **Clerk supplies it and it is wrong for us.** `form_identifier_exists`
 *    renders as "This email address is taken. Please try another.",
 *    written for someone choosing a username. Told to a person who
 *    already has an account, it advises the one thing that cannot work.
 *
 * So refusals we have thought about are worded here and take precedence
 * over Clerk's; everything else still prefers Clerk's own string, which
 * is usually better than any generic sentence we could write; and the
 * fallback is last rather than first.
 *
 * Codes are Clerk's, taken from its localization table rather than
 * invented — `unstable__errors` in `@clerk/shared`, which is where its
 * own components look these up. Clerk reports some of them twice, plain
 * and qualified by the field (`__email_address`), and this product only
 * ever signs anyone up with an email address, so both spellings are
 * listed rather than guessed between.
 *
 * Not localized, and deliberately not: every other string in
 * `auth-form.tsx` is English too. Translating that surface is a pass of
 * its own — the copy would want the `AUTH_ACTIONS` treatment in
 * `@/lib/i18n` — and one translated sentence among twenty English ones
 * is not a start on it.
 */

/** The shape both `useSignIn` and `useSignUp` resolve their failures as. */
export type ClerkRefusal = { code: string; longMessage?: string };

/**
 * Creating the account and sending the code are two separate calls, and
 * they fail for different reasons. One fallback covering both reported
 * every refused sign-up as a delivery problem, which is how "you already
 * have an account" came to read as "check your email address".
 */
export const SIGN_UP_CREATE_FALLBACK =
  "We could not create an account with those details. Check them and try again.";

export const SIGN_UP_SEND_FALLBACK =
  "We could not send a code to that address. Check it and try again.";

/**
 * Sign-in must not quietly create an account for a typo'd address, so
 * the two modes fail differently on purpose.
 */
export const SIGN_IN_FALLBACK =
  "We could not find an account for that address. Create one instead.";

/**
 * The refusals we say in our own words. Keyed by Clerk's code, and kept
 * to failures actually reachable from these doors: this product signs
 * people in and up with an emailed code, so nothing here concerns
 * passwords, usernames or phone numbers.
 */
const OUR_WORDS: Record<string, string> = {
  // The reported bug. "Sign in" is the whole of the useful half — the
  // panel already carries the link, so the sentence names the action the
  // visitor can take rather than the rule they broke.
  form_identifier_exists:
    "You already have an account with that address. Sign in instead.",
  form_identifier_exists__email_address:
    "You already have an account with that address. Sign in instead.",

  // Clerk's own copy for these is serviceable, but it is also the copy
  // most often missing from the API response, and "check the address" is
  // useless without saying what is wrong with it.
  form_param_format_invalid:
    "That does not look like an email address. Check it and try again.",
  form_param_format_invalid__email_address:
    "That does not look like an email address. Check it and try again.",

  // Restricted sign-ups and blocked domains. Both mean the same thing to
  // the person reading them — this address cannot open an account — and
  // neither is something they can fix by retyping, so neither should say
  // "try again".
  form_email_address_blocked:
    "That email address cannot be used to open an account.",
  not_allowed_access:
    "That email address cannot be used to open an account.",

  // Bot protection. Neither of these is about what the person typed, and
  // the generic fallback said it was — "check them and try again" over a
  // form whose every field is already correct, which is a loop with
  // nothing in it to fix. What actually clears a refused challenge is a
  // fresh page, so that is what the sentence asks for.
  captcha_invalid:
    "We could not complete the security check. Refresh the page and try again.",

  // Not the visitor's to fix at all: the instance is asking for a
  // challenge it has not switched on. Saying so is more use than sending
  // them back to the fields, and stops a support thread about an address
  // that was never the problem.
  captcha_not_enabled:
    "We could not run the security check. That is a fault at our end — try again in a few minutes.",
};

/**
 * The sentence to show for a Clerk refusal: ours if we have one for this
 * code, then Clerk's own, then the caller's fallback.
 */
export function messageForClerkError(
  error: ClerkRefusal,
  fallback: string
): string {
  return OUR_WORDS[error.code] ?? error.longMessage ?? fallback;
}

/**
 * Whether a refused verification is refusing because it is already done.
 *
 * Clerk answers a code submitted against a verification it has already
 * accepted with `verification_already_verified` and a 400, which reads
 * as a failure and is the opposite of one: the email is verified, and
 * the only thing left is to finalize the attempt.
 *
 * Taking it at face value strands the person. `attempt_verification`
 * moves the verification to a terminal state, so once it is there every
 * later submission of that code refuses identically — a sign-up that
 * treats the refusal as a bad code can never reach `finalize()`, and the
 * screen has nothing else to offer. Staging produced exactly that on
 * 2026-09-09: `status: verified`, `created_user_id: null`, three times.
 *
 * So it is reported as a state, not worded as a refusal — the caller
 * carries on rather than saying anything, which is why the code is
 * deliberately absent from `OUR_WORDS`. Narrow on purpose: every other
 * refusal, a wrong code and an expired one included, still fails.
 */
export function isVerificationAlreadyDone(
  error: ClerkRefusal | null | undefined
): boolean {
  return error?.code === "verification_already_verified";
}
