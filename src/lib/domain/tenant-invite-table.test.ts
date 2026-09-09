import { describe, expect, it } from "vitest";

import { tenantInviteMatches } from "./tenant-invite-table";

const client = { email: "ada@example.com", fullName: "Ada Obi", kind: "client" as const };
const colleague = { email: "kemi@sahara.ng", fullName: "", kind: "staff" as const };

describe("tenantInviteMatches", () => {
  it("keeps every row when nothing is asked of it", () => {
    expect(tenantInviteMatches(client, "", "")).toBe(true);
  });

  it("matches the address, whatever the case or padding", () => {
    expect(tenantInviteMatches(client, "ADA@", "")).toBe(true);
    expect(tenantInviteMatches(client, "  example.com ", "")).toBe(true);
  });

  it("matches the name when there is one", () => {
    expect(tenantInviteMatches(client, "obi", "")).toBe(true);
  });

  it("survives a row invited with no name", () => {
    expect(tenantInviteMatches(colleague, "kemi", "")).toBe(true);
    expect(tenantInviteMatches(colleague, "obi", "")).toBe(false);
  });

  it("narrows to what somebody was invited to be", () => {
    expect(tenantInviteMatches(client, "", "client")).toBe(true);
    expect(tenantInviteMatches(client, "", "staff")).toBe(false);
    expect(tenantInviteMatches(colleague, "", "staff")).toBe(true);
  });

  it("ignores a kind nobody offers rather than emptying the panel", () => {
    expect(tenantInviteMatches(client, "", "banana")).toBe(true);
  });
});
