import { describe, expect, it } from "vitest";

import {
  SIGN_IN_FALLBACK,
  SIGN_UP_CREATE_FALLBACK,
  SIGN_UP_SEND_FALLBACK,
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
});
