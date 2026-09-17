import { describe, expect, it } from "vitest";

import { shortName } from "@/lib/format/name";

describe("shortName", () => {
  it("keeps the first name and the last name's initial", () => {
    expect(shortName("Ngozi Balogun", "ngozi@beorchid.com")).toBe("Ngozi B.");
  });

  it("uses the last word, not the second, for a longer name", () => {
    expect(shortName("Ada Chioma Obi")).toBe("Ada O.");
  });

  it("ignores extra spaces, tabs and padding", () => {
    expect(shortName("  Ngozi \t  Balogun  ")).toBe("Ngozi B.");
  });

  it("leaves a single name whole", () => {
    expect(shortName("Peace")).toBe("Peace");
    expect(shortName("  Peace  ")).toBe("Peace");
  });

  it("capitalises a lower-case surname's initial", () => {
    expect(shortName("Ana de souza")).toBe("Ana S.");
  });

  it("falls back to the address before its @ when there is no name", () => {
    expect(shortName("", "ngozi.balogun@beorchid.com")).toBe("ngozi.balogun");
    expect(shortName("   ", "ops@beorchid.com")).toBe("ops");
    expect(shortName(null, "ops@beorchid.com")).toBe("ops");
  });

  it("returns an empty string with neither", () => {
    expect(shortName("", "")).toBe("");
    expect(shortName(undefined)).toBe("");
  });

  it("does not split a character outside the BMP", () => {
    expect(shortName("Zed 𝒜bara")).toBe("Zed 𝒜.");
  });
});
