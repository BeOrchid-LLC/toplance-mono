import { describe, expect, it } from "vitest";

import { domainOf, isWorkEmail, workEmailRefusal } from "./work-email";

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
