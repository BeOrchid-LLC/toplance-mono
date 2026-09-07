import { afterEach, describe, expect, it, vi } from "vitest";

import {
  domainOf,
  isWorkEmail,
  workEmailRefusal,
  workEmailRuleEnforced,
} from "./work-email";

describe("domainOf", () => {
  it("takes the part after the last @", () => {
    expect(domainOf("bola@sunwaytravel.ng")).toBe("sunwaytravel.ng");
  });

  it("lowercases, because a deny list cannot match GMAIL.COM otherwise", () => {
    expect(domainOf("Bola@GMAIL.com")).toBe("gmail.com");
  });

  it("is null for anything that is not an address", () => {
    expect(domainOf("bola")).toBeNull();
    expect(domainOf("bola@")).toBeNull();
  });
});

describe("isWorkEmail", () => {
  it("accepts an organisation's own domain", () => {
    expect(isWorkEmail("bola@sunwaytravel.ng")).toBe(true);
  });

  it("refuses the consumer mailboxes people use personally", () => {
    for (const email of [
      "bola@gmail.com",
      "bola@yahoo.com",
      "bola@outlook.com",
      "bola@icloud.com",
    ]) {
      expect(isWorkEmail(email)).toBe(false);
    }
  });

  it("refuses a consumer domain typed in capitals", () => {
    expect(isWorkEmail("Bola@Gmail.COM")).toBe(false);
  });

  it("refuses anything with no domain at all", () => {
    expect(isWorkEmail("bola")).toBe(false);
  });

  it("accepts a subdomain of a consumer host, which is not the host", () => {
    // `mail.gmail.com` is nobody's mailbox, but the rule is exact-match
    // on purpose: a suffix test would also refuse `agency.mail.com`-style
    // real domains, and turning away a customer is the costlier error.
    expect(isWorkEmail("bola@mail.gmail.com")).toBe(true);
  });
});

describe("workEmailRefusal", () => {
  it("names the domain it is refusing, so the rule is visible", () => {
    expect(workEmailRefusal("bola@gmail.com")).toContain("gmail.com");
  });

  it("still reads as a sentence when there is no domain to name", () => {
    expect(workEmailRefusal("bola")).not.toContain("—");
  });
});

describe("workEmailRuleEnforced", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("enforces the rule when nothing has been set", () => {
    vi.stubEnv("NEXT_PUBLIC_ALLOW_PERSONAL_ORG_EMAIL", "");
    expect(workEmailRuleEnforced()).toBe(true);
  });

  it("stands the rule down for a developer who opted out", () => {
    vi.stubEnv("NEXT_PUBLIC_ALLOW_PERSONAL_ORG_EMAIL", "1");
    expect(workEmailRuleEnforced()).toBe(false);
  });

  it("ignores any value other than the exact opt-out", () => {
    // A half-set variable — `true`, `yes`, a leftover comment — must
    // not be the thing that opens organisation sign-up.
    for (const value of ["true", "yes", "0", "on"]) {
      vi.stubEnv("NEXT_PUBLIC_ALLOW_PERSONAL_ORG_EMAIL", value);
      expect(workEmailRuleEnforced()).toBe(true);
    }
  });

  it("keeps enforcing in production however the environment is set", () => {
    // The seam is a local convenience. A variable that leaks into a
    // deployed environment must not open the door there.
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_ALLOW_PERSONAL_ORG_EMAIL", "1");
    expect(workEmailRuleEnforced()).toBe(true);
  });

  it("leaves isWorkEmail itself telling the truth either way", () => {
    // The seam decides whether the answer is acted on, never what the
    // answer is — the licence check still has a real signal to read.
    vi.stubEnv("NEXT_PUBLIC_ALLOW_PERSONAL_ORG_EMAIL", "1");
    expect(isWorkEmail("bola@gmail.com")).toBe(false);
  });
});
