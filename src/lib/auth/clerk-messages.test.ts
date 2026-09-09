import { describe, expect, it } from "vitest";

import {
  SIGN_IN_FALLBACK,
  SIGN_UP_CREATE_FALLBACK,
  SIGN_UP_SEND_FALLBACK,
  isVerificationAlreadyDone,
  messageForClerkError,
} from "@/lib/auth/clerk-messages";

describe("messageForClerkError", () => {
  // The bug this module was written for. A director who had already
  // signed up was told "We could not send a code to that address. Check
  // it and try again." — which names the wrong step, blames the address,
  // and sends them back to retype an address that was correct.
  it("says the account already exists rather than blaming the address", () => {
    const message = messageForClerkError(
      { code: "form_identifier_exists" },
      SIGN_UP_CREATE_FALLBACK
    );
    expect(message).toMatch(/already have an account/i);
    expect(message).toMatch(/sign in/i);
    expect(message).not.toBe(SIGN_UP_CREATE_FALLBACK);
  });

  // Clerk reports the same refusal under a field-qualified code when the
  // identifier is an email address, which is the only kind this product
  // signs anyone up with — so both spellings have to land on the sentence.
  it("recognises the email-qualified spelling of the same refusal", () => {
    expect(
      messageForClerkError({ code: "form_identifier_exists__email_address" }, "fallback")
    ).toBe(messageForClerkError({ code: "form_identifier_exists" }, "fallback"));
  });

  // Clerk's own copy for this code is "This email address is taken.
  // Please try another." — written for someone choosing a username. For a
  // person who already has an account it is the opposite of the advice
  // they need, so ours wins even when Clerk supplies one.
  it("prefers our wording over Clerk's for a refusal we have thought about", () => {
    const message = messageForClerkError(
      {
        code: "form_identifier_exists",
        longMessage: "This email address is taken. Please try another.",
      },
      "fallback"
    );
    expect(message).not.toMatch(/try another/i);
    expect(message).toMatch(/sign in/i);
  });

  // For everything we have not thought about, Clerk's user-facing string
  // beats a generic sentence of ours.
  it("uses Clerk's own message for a refusal we have no words for", () => {
    expect(
      messageForClerkError(
        { code: "form_password_pwned", longMessage: "That password has been found in a breach." },
        "fallback"
      )
    ).toBe("That password has been found in a breach.");
  });

  // `longMessage` is optional in the Future API — this is the exact hole
  // the reported bug fell through.
  it("falls back when Clerk supplies no user-facing message", () => {
    expect(messageForClerkError({ code: "some_unmapped_code" }, "fallback")).toBe(
      "fallback"
    );
  });

  it("names the step that actually failed", () => {
    // Creating the account and sending the code are two calls, and they
    // fail for different reasons. A fallback that only ever describes the
    // send reports a refused sign-up as a delivery problem.
    expect(SIGN_UP_CREATE_FALLBACK).not.toBe(SIGN_UP_SEND_FALLBACK);
    expect(SIGN_UP_SEND_FALLBACK).toMatch(/code/i);
    expect(SIGN_UP_CREATE_FALLBACK).not.toMatch(/send/i);
    expect(SIGN_IN_FALLBACK).toMatch(/could not find an account/i);
  });

  it("turns a mistyped address into a sentence about the address", () => {
    expect(
      messageForClerkError({ code: "form_param_format_invalid__email_address" }, "fallback")
    ).toMatch(/email address/i);
  });

  // Seen on staging on 2026-09-09: bot protection refused the attempt and
  // the form said "We could not create an account with those details.
  // Check them and try again." The details were correct, and no amount of
  // checking them changes a security check — so the sentence sends the
  // person round a loop with nothing to fix.
  it("does not blame the details when the security check is what failed", () => {
    const message = messageForClerkError(
      { code: "captcha_invalid" },
      SIGN_UP_CREATE_FALLBACK
    );

    expect(message).not.toBe(SIGN_UP_CREATE_FALLBACK);
    expect(message).not.toMatch(/details/i);
    expect(message).toMatch(/security check/i);
  });

  // The instance is misconfigured, not the person. Telling them to check
  // their details is worse than useless here: there is nothing they can
  // do, and the only honest answer is that it is our end.
  it("owns a security check that was never switched on", () => {
    const message = messageForClerkError(
      { code: "captcha_not_enabled" },
      SIGN_UP_CREATE_FALLBACK
    );

    expect(message).not.toBe(SIGN_UP_CREATE_FALLBACK);
    expect(message).not.toMatch(/details/i);
  });
});

/**
 * Seen on staging on 2026-09-09, three times, against a Clerk
 * development instance: a fresh sign-up submits the code, Clerk answers
 * `400 verification_already_verified`, and the attempt is left with
 * `status: verified` and `created_user_id: null` — verified, but with no
 * account, because the form treated the refusal as a failed code and
 * returned before it could finalize.
 *
 * That state is terminal: every later submission of the same code
 * refuses the same way, so the screen can never move on. Naming the code
 * here rather than in the component keeps the knowledge beside the rest
 * of Clerk's vocabulary, and makes the one branch that matters testable
 * without mounting a form that needs `useSignUp`.
 */
describe("isVerificationAlreadyDone", () => {
  it("reads an already-verified refusal as work that is finished", () => {
    expect(isVerificationAlreadyDone({ code: "verification_already_verified" })).toBe(true);
  });

  // The distinction the whole branch rests on: a wrong code must still
  // fail, or a typo would be waved through to a finalize that cannot
  // succeed and an error nobody can act on.
  it("leaves a genuinely wrong code failing", () => {
    expect(isVerificationAlreadyDone({ code: "form_code_incorrect" })).toBe(false);
    expect(isVerificationAlreadyDone({ code: "verification_expired" })).toBe(false);
  });

  // `verified.error` is absent on the ordinary happy path, and the
  // caller asks this question before it knows whether there was one.
  it("treats no error at all as nothing to forgive", () => {
    expect(isVerificationAlreadyDone(undefined)).toBe(false);
    expect(isVerificationAlreadyDone(null)).toBe(false);
  });

  // It is a signal, not a sentence: the form continues rather than
  // showing anything, so it deliberately has no entry in `OUR_WORDS`.
  it("does not become a message the person is shown", () => {
    expect(
      messageForClerkError({ code: "verification_already_verified" }, "fallback")
    ).toBe("fallback");
  });
});
