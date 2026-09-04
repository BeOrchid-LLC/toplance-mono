import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { insecureConnectionReason } from "./client";

/**
 * The warning is a module-load side effect, so proving it fires means
 * loading the module again with a different environment. `resetModules`
 * gives a fresh copy; the latch it sets lives on `globalThis` and
 * therefore survives that, so each case clears it first — which is also
 * the only way to test that the latch works at all.
 */
type DbGlobal = { pool?: unknown; sslWarned?: boolean };

async function loadWith(url: string | undefined) {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const previous = process.env.DATABASE_URL;

  if (url === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = url;

  vi.resetModules();
  await import("./client");

  if (previous === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = previous;

  const calls = warn.mock.calls.map((c) => String(c[0]));
  warn.mockRestore();
  return calls;
}

describe("the insecure-connection warning", () => {
  beforeEach(() => {
    // Both latches, or the pool assertion below passes on one a previous
    // case left behind. `new Pool` opens no connection, so dropping the
    // reference costs nothing here.
    delete (globalThis as DbGlobal).sslWarned;
    delete (globalThis as DbGlobal).pool;
  });

  afterEach(() => {
    delete (globalThis as DbGlobal).sslWarned;
    vi.resetModules();
  });

  it("warns loudly, and names the host, for a remote URL with no sslmode", async () => {
    const calls = await loadWith("postgres://u:p@db.example.com:5432/toplance");
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain("INSECURE DATABASE CONNECTION");
    expect(calls[0]).toContain("db.example.com");
    expect(calls[0]).toContain("sslmode");
  });

  it("says nothing for a loopback URL", async () => {
    expect(
      await loadWith("postgres://toplance:toplance@127.0.0.1:54329/toplance")
    ).toEqual([]);
  });

  it("says nothing once sslmode is set", async () => {
    expect(
      await loadWith("postgres://u:p@db.example.com:5432/t?sslmode=verify-full")
    ).toEqual([]);
  });

  it("warns once per process, not once per hot reload", async () => {
    const first = await loadWith("postgres://u:p@db.example.com:5432/t");
    expect(first).toHaveLength(1);

    // Same latch, fresh module — what a Next hot reload does.
    const second = await loadWith("postgres://u:p@db.example.com:5432/t");
    expect(second).toEqual([]);
  });

  it("does not stop the pool being built", async () => {
    await loadWith("postgres://u:p@db.example.com:5432/t");
    expect((globalThis as DbGlobal).pool).toBeDefined();
  });
});

const REMOTE = "postgres://u:p@db.example.com:5432/toplance";

describe("insecureConnectionReason", () => {
  it("says nothing about a loopback connection", () => {
    for (const url of [
      "postgres://toplance:toplance@127.0.0.1:54329/toplance",
      "postgres://toplance:toplance@localhost:5432/toplance",
      "postgres://toplance:toplance@[::1]:5432/toplance",
    ]) {
      expect(insecureConnectionReason(url)).toBeNull();
    }
  });

  it("refuses a remote host that names no sslmode", () => {
    expect(insecureConnectionReason(REMOTE)).toContain("no sslmode");
  });

  it("names the host it is refusing, so the message is actionable", () => {
    expect(insecureConnectionReason(REMOTE)).toContain("db.example.com");
  });

  it.each(["disable", "allow", "prefer"])(
    "refuses sslmode=%s, which only permits encryption",
    (mode) => {
      expect(insecureConnectionReason(`${REMOTE}?sslmode=${mode}`)).toContain(
        `sslmode=${mode}`
      );
    }
  );

  it.each(["require", "verify-ca", "verify-full"])(
    "accepts sslmode=%s",
    (mode) => {
      expect(insecureConnectionReason(`${REMOTE}?sslmode=${mode}`)).toBeNull();
    }
  );

  it("stays quiet when there is no URL at all", () => {
    // `hasDatabaseEnv` is what turns those deployments off; this is not
    // the place to duplicate that decision.
    expect(insecureConnectionReason(undefined)).toBeNull();
    expect(insecureConnectionReason("")).toBeNull();
  });

  it("leaves an unparseable URL to pg, which reports it better", () => {
    expect(insecureConnectionReason("not a url")).toBeNull();
  });
});
