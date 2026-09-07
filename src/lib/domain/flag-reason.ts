import type { FlagReason } from "@/lib/db/schema";

/**
 * The `flag_reason` enum as a value, for the picker that collects one
 * and the action that validates it.
 *
 * Written out rather than read from `flagReason.enumValues`, because
 * this is imported by a client component and the schema module pulls
 * drizzle with it — the same reason `@/lib/domain/status` takes its
 * enums as types only.
 *
 * The `Record<FlagReason, true>` is what keeps the two in step: adding a
 * reason to the enum and not to this map is a compile error here, not a
 * gap discovered when a reviewer's flag is silently refused.
 */
const ALL: Record<FlagReason, true> = {
  unreadable: true,
  expired: true,
  wrong_document: true,
  incomplete: true,
  mismatch: true,
  other: true,
};

export const FLAG_REASON_KEYS = Object.keys(ALL) as FlagReason[];

/**
 * `Object.hasOwn`, not `in`: `in` walks the prototype chain, so
 * `isFlagReason("toString")` was true and a crafted `reason_code` rode
 * that all the way to the `flag_reason` enum column, where Postgres
 * rejected it as a 500 rather than a field error.
 */
export function isFlagReason(value: string): value is FlagReason {
  return Object.hasOwn(ALL, value);
}
