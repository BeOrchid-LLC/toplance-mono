import { describe, expect, it } from "vitest";

import { EVENT_NAMES } from "@/lib/analytics/events";

/**
 * AGENTS.md, locked 2026-08-21: analytics events are
 * `app.object_action`, all lowercase, for every BeOrchid app. Nothing in
 * this repo emitted analytics before these, so the first event sets the
 * precedent — which is why the format is a test and not a convention
 * someone has to remember.
 */
describe("event names", () => {
  it("all match app.object_action, lowercase", () => {
    for (const name of EVENT_NAMES) {
      expect(name).toMatch(/^toplance\.[a-z0-9]+(?:_[a-z0-9]+)+$/);
    }
  });

  it("all belong to this app", () => {
    for (const name of EVENT_NAMES) {
      expect(name.startsWith("toplance.")).toBe(true);
    }
  });

  it("has no duplicates", () => {
    expect(new Set(EVENT_NAMES).size).toBe(EVENT_NAMES.length);
  });
});
