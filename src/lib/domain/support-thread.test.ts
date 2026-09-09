import { describe, expect, it } from "vitest";

import { canPostSupportMessage } from "./support-thread";

const request = { orgId: "org-1", state: "open" as const };

describe("canPostSupportMessage", () => {
  it("lets any member of the agency that raised it post", () => {
    expect(canPostSupportMessage(request, { kind: "agency", orgId: "org-1" })).toBe(true);
  });

  it("refuses a member of a different agency", () => {
    // The whole table is one queue. Without this, an agency member who
    // guessed a request id could read and answer another tenant's
    // dispute.
    expect(canPostSupportMessage(request, { kind: "agency", orgId: "org-2" })).toBe(false);
  });

  it("lets any member of staff post, whichever agency raised it", () => {
    expect(canPostSupportMessage(request, { kind: "staff" })).toBe(true);
  });

  it("refuses an agency member with no agency at all", () => {
    expect(canPostSupportMessage(request, { kind: "agency", orgId: null })).toBe(false);
  });

  it("refuses everybody once the request is resolved", () => {
    // Reopening is a state change somebody makes deliberately, not a
    // side effect of typing into a thread that reads as closed.
    const done = { orgId: "org-1", state: "resolved" as const };
    expect(canPostSupportMessage(done, { kind: "agency", orgId: "org-1" })).toBe(false);
    expect(canPostSupportMessage(done, { kind: "staff" })).toBe(false);
  });

  it("still allows posting on a claimed request", () => {
    const claimed = { orgId: "org-1", state: "claimed" as const };
    expect(canPostSupportMessage(claimed, { kind: "staff" })).toBe(true);
    expect(canPostSupportMessage(claimed, { kind: "agency", orgId: "org-1" })).toBe(true);
  });
});
