/** No signed-in user. The caller should redirect to a sign-in screen. */
export class UnauthenticatedError extends Error {
  constructor() {
    super("Not signed in.");
    this.name = "UnauthenticatedError";
  }
}

/**
 * A signed-in user asked for something that is not theirs. Never
 * include the subject in the message: an error that distinguishes "does
 * not exist" from "exists but is not yours" is a disclosure.
 */
export class ForbiddenError extends Error {
  constructor() {
    super("Not allowed.");
    this.name = "ForbiddenError";
  }
}
