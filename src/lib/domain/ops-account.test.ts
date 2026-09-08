import { describe, expect, it } from "vitest";

import { OPS_PROFILE_HREF, opsAccountBlock, opsSubtitle } from "@/lib/domain/ops-account";
import { OPS_COMMON } from "@/lib/i18n/ops-common";
import { LOCALES } from "@/lib/i18n/locales";

describe("opsSubtitle", () => {
  it("names the console and the rank", () => {
    expect(opsSubtitle("owner", "en")).toBe("Toplance operations · owner");
    expect(opsSubtitle("reviewer", "en")).toBe("Toplance operations · reviewer");
  });

  /**
   * `actor.staffRole` is nullable, and the six ops pages each wrote
   * `?? "reviewer"` by hand. A null that resolved upwards — or crashed
   * the lookup — would be a rank in the rail nobody holds.
   */
  it("reads an unset rank as the lesser one", () => {
    expect(opsSubtitle(null, "en")).toBe(opsSubtitle("reviewer", "en"));
    expect(opsSubtitle(undefined, "en")).toBe(opsSubtitle("reviewer", "en"));
  });

  it("is translated everywhere the console is", () => {
    for (const { code } of LOCALES) {
      expect(opsSubtitle("owner", code)).toBe(
        `${OPS_COMMON.subtitlePrefix[code]} · ${OPS_COMMON.staffRole.owner[code]}`
      );
    }
  });
});

describe("opsAccountBlock", () => {
  const profile = {
    fullName: "Ngozi Balogun",
    email: "ngozi@toplance.test",
    staffRole: "owner" as const,
    locale: "en" as const,
  };

  /**
   * The whole reason this helper exists: six pages built this block by
   * hand and every one of them omitted `profileHref`, so the account
   * menu offered staff no way to their own profile.
   */
  it("points staff at their own profile", () => {
    expect(opsAccountBlock(profile).profileHref).toBe(OPS_PROFILE_HREF);
    expect(OPS_PROFILE_HREF).toBe("/ops/profile");
  });

  it("carries the name, the address and the rank", () => {
    expect(opsAccountBlock(profile)).toMatchObject({
      name: "Ngozi Balogun",
      email: "ngozi@toplance.test",
      subtitle: "Toplance operations · owner",
    });
  });

  /** No photo yet is `null`, never an empty string the avatar would try to load. */
  it("has no photo until one is signed", () => {
    expect(opsAccountBlock(profile).avatarUrl).toBeNull();
    expect(opsAccountBlock({ ...profile, avatarUrl: "https://r2/x" }).avatarUrl).toBe(
      "https://r2/x"
    );
  });
});
