import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  actionForInsecureConnection,
  insecureConnectionReason,
  isPrivateHost,
  poolMax,
} from "./client";

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

describe("isPrivateHost", () => {
  it.each([
    "localhost",
    "::1",
    "127.0.0.1",
    "127.10.0.9",
    // Compose/Kubernetes service names: a single label has no public DNS.
    "postgres",
    "db",
    "toplance_postgres",
    "db.internal",
    "postgres.local",
    "api.home.arpa",
    "10.0.0.5",
    "172.16.4.1",
    "172.31.255.254",
    "192.168.1.20",
    "169.254.10.1",
    "fd00::1",
    "fe80::1",
  ])("treats %s as private", (host) => {
    expect(isPrivateHost(host)).toBe(true);
  });

  it.each([
    "db.example.com",
    "ep-cool-name.eu-central-1.aws.neon.tech",
    "8.8.8.8",
    "172.15.0.1", // just below the RFC 1918 block
    "172.32.0.1", // just above it
    "192.169.1.1",
    "2606:4700::1",
  ])("treats %s as public", (host) => {
    expect(isPrivateHost(host)).toBe(false);
  });
});

describe("the private-network false positive this closed", () => {
  /**
   * Coolify reaches its managed Postgres by Docker service name. The
   * original loopback set matched three literals, so that connection
   * warned every boot — the one warning that had to stay meaningful,
   * fired on the deployment's normal state.
   */
  it("says nothing about a Docker service name with no sslmode", () => {
    expect(insecureConnectionReason("postgres://u:p@postgres:5432/toplance")).toBeNull();
    expect(insecureConnectionReason("postgres://u:p@10.0.1.4:5432/toplance")).toBeNull();
  });

  it("still refuses a managed host reached across the internet", () => {
    expect(
      insecureConnectionReason("postgres://u:p@ep-x.eu-central-1.aws.neon.tech/t")
    ).toContain("no sslmode");
  });
});

describe("actionForInsecureConnection", () => {
  it("allows a connection with nothing wrong with it", () => {
    expect(
      actionForInsecureConnection({ reason: null, isProduction: true })
    ).toBe("allow");
  });

  it("never allows one with a reason", () => {
    for (const isProduction of [true, false]) {
      expect(
        actionForInsecureConnection({ reason: "cleartext", isProduction })
      ).not.toBe("allow");
    }
  });

  it("refuses in production, where the data is real", () => {
    // The whole point of the seam: a deploy that loses its sslmode does
    // not start. A site that is down leaks nothing.
    expect(
      actionForInsecureConnection({ reason: "cleartext", isProduction: true })
    ).toBe("refuse");
  });

  it("only warns outside production, so staging work is not blocked", () => {
    expect(
      actionForInsecureConnection({ reason: "cleartext", isProduction: false })
    ).toBe("warn");
  });
});

describe("what a production boot does about a cleartext connection", () => {
  const NODE_ENV = process.env.NODE_ENV;
  const DATABASE_URL = process.env.DATABASE_URL;

  afterEach(() => {
    // DATABASE_URL as well as NODE_ENV: these cases point it at a fake
    // remote host, and leaving that behind would hand the next test a
    // connection string to nowhere.
    vi.stubEnv("NODE_ENV", NODE_ENV ?? "test");
    if (DATABASE_URL === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = DATABASE_URL;
    delete (globalThis as DbGlobal).sslWarned;
    delete (globalThis as DbGlobal).pool;
    vi.resetModules();
  });

  it("throws at module load rather than building a pool", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.DATABASE_URL = "postgres://u:p@db.example.com:5432/toplance";
    delete (globalThis as DbGlobal).sslWarned;
    delete (globalThis as DbGlobal).pool;
    vi.resetModules();

    await expect(import("./client")).rejects.toThrow(
      /INSECURE DATABASE CONNECTION/
    );
    // Nothing downstream can query, because nothing downstream got a pool.
    expect((globalThis as DbGlobal).pool).toBeUndefined();
  });

  it("boots normally in production when sslmode is set", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.DATABASE_URL =
      "postgres://u:p@db.example.com:5432/t?sslmode=verify-full";
    delete (globalThis as DbGlobal).sslWarned;
    delete (globalThis as DbGlobal).pool;
    vi.resetModules();

    await expect(import("./client")).resolves.toBeDefined();
  });
});

/**
 * The suite's own connection budget.
 *
 * `npm test` failed 18 tests on one run of this machine and 81 on the
 * next, every one of them a 5s or 10s timeout in a database-backed file,
 * and the reds moved between runs with Postgres otherwise idle. That
 * looked like a flaky machine for long enough to be written down as one,
 * in a handoff and in a commit message.
 *
 * It is arithmetic. `max_connections` is 100. Vitest's fork pool takes
 * one worker per CPU less one — 13 here — and each worker is a process
 * with its own module graph and therefore its own `pg` Pool, whose
 * default `max` is 10. 13 × 10 = 130, and every connection past the
 * limit gets `too many clients already` while the worker behind it waits
 * out its timeout on a slot that is never coming. 16 of those appeared
 * verbatim in one run's output, under 44 timeouts that hid them.
 *
 * Nothing about that is specific to this machine — it fires on any host
 * with 11 or more cores, and a dev server holding its own pool moves the
 * threshold lower. So the fix is a budget rather than a retry.
 */
describe("poolMax", () => {
  it("leaves production on the driver's own default", () => {
    expect(poolMax({})).toBe(10);
  });

  it("fits every test worker inside max_connections at once", () => {
    const perWorker = poolMax({ VITEST: "true" });
    const workers = 32; // far past this machine; the budget must still hold
    expect(perWorker * workers).toBeLessThanOrEqual(100);
  });

  it("still gives a test worker more than one connection", () => {
    // A file that opens a transaction and queries inside it needs two.
    expect(poolMax({ VITEST: "true" })).toBeGreaterThan(1);
  });

  it("takes an explicit override ahead of either default", () => {
    expect(poolMax({ DATABASE_POOL_MAX: "4", VITEST: "true" })).toBe(4);
    expect(poolMax({ DATABASE_POOL_MAX: "40" })).toBe(40);
  });

  it("ignores an override that is not a positive integer", () => {
    expect(poolMax({ DATABASE_POOL_MAX: "0" })).toBe(10);
    expect(poolMax({ DATABASE_POOL_MAX: "-2" })).toBe(10);
    expect(poolMax({ DATABASE_POOL_MAX: "many" })).toBe(10);
  });
});
