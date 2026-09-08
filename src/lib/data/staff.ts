import "server-only";

import { asc, eq } from "drizzle-orm";

import type { StaffRole } from "@/lib/auth/policy";
import { db } from "@/lib/db/client";
import { profiles } from "@/lib/db/schema";

/**
 * One person who actually holds a BeOrchid console account.
 *
 * Distinct from `PlatformStaff` in `@/lib/data/demo-requests`, which is
 * the assignee picker's shape and carries no rank: a picker needs a name
 * to put in a dropdown, and the colleagues roster needs to say who is a
 * director. Kept apart rather than widened, so the enquiry screen does
 * not start reading a column it has no use for.
 */
export type StaffColleague = {
  id: string;
  fullName: string;
  email: string;
  /**
   * `null` for a staff account made before `staff_role` was written by
   * anything but hand-run SQL. Read as "reviewer" wherever it is shown,
   * the same default `isOwner` applies — the rank that grants nothing.
   */
  staffRole: StaffRole | null;
  createdAt: Date;
};

/**
 * Everyone who works at BeOrchid, newest last.
 *
 * `role = 'staff'` is the whole filter, because it is the whole
 * definition: `staff_role_only_for_staff` already forbids a rank on any
 * other row, so there is no such thing as a director who is not staff.
 *
 * Ordered by arrival rather than by name. The list is short and its
 * question is "who joined, and when" — a roster sorted alphabetically
 * puts the person hired this morning in the middle of it.
 */
export async function listStaffColleagues(): Promise<StaffColleague[]> {
  return db
    .select({
      id: profiles.id,
      fullName: profiles.fullName,
      email: profiles.email,
      staffRole: profiles.staffRole,
      createdAt: profiles.createdAt,
    })
    .from(profiles)
    .where(eq(profiles.role, "staff"))
    .orderBy(asc(profiles.createdAt));
}
