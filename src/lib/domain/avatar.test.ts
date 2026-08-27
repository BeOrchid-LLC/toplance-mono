import { describe, expect, it } from "vitest";

import { avatarKey, validateAvatarFile } from "@/lib/domain/avatar";

describe("validateAvatarFile", () => {
  it("accepts a jpeg under the size cap", () => {
    expect(validateAvatarFile("image/jpeg", 2 * 1024 * 1024)).toBeNull();
  });

  it("accepts png and webp", () => {
    expect(validateAvatarFile("image/png", 1024)).toBeNull();
    expect(validateAvatarFile("image/webp", 1024)).toBeNull();
  });

  it("rejects a type that is not a photo", () => {
    expect(validateAvatarFile("application/pdf", 1024)).toMatch(/JPEG|PNG|WebP/);
    expect(validateAvatarFile("image/svg+xml", 1024)).toMatch(/JPEG|PNG|WebP/);
  });

  it("rejects an empty file", () => {
    expect(validateAvatarFile("image/jpeg", 0)).toMatch(/Choose a photo/);
  });

  it("rejects a file over 5MB", () => {
    expect(validateAvatarFile("image/jpeg", 5 * 1024 * 1024 + 1)).toMatch(
      /over 5MB/
    );
  });
});

describe("avatarKey", () => {
  it("namespaces the object by user and stamps the moment", () => {
    const key = avatarKey("user_123", "image/png", 1724742000000);
    expect(key).toBe("avatars/user_123/1724742000000.png");
  });

  it("maps jpeg to a jpg extension", () => {
    expect(avatarKey("u", "image/jpeg", 1)).toBe("avatars/u/1.jpg");
  });

  it("maps webp to webp", () => {
    expect(avatarKey("u", "image/webp", 1)).toBe("avatars/u/1.webp");
  });
});
