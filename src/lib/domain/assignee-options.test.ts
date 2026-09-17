import { describe, expect, it } from "vitest";

import { assigneeOptions, type AssigneePerson } from "@/lib/domain/assignee-options";

const ME: AssigneePerson = { id: "me", fullName: "Ngozi Balogun", email: "ngozi@beorchid.com" };
const ADA: AssigneePerson = { id: "ada", fullName: "Ada Chioma Obi", email: "ada@beorchid.com" };
const BO: AssigneePerson = { id: "bo", fullName: "", email: "bo.lee@beorchid.com" };
const PEOPLE = [ME, ADA, BO];

/** The options as `kind:value` pairs, which is what the rules decide. */
function shape(input: Parameters<typeof assigneeOptions>[0]) {
  return assigneeOptions(input).options.map((o) => `${o.kind}:${o.value}`);
}

describe("assigneeOptions", () => {
  it("offers Unassigned, Assign to me and everyone else to someone who may name anyone", () => {
    expect(
      shape({ value: null, viewerId: "me", people: PEOPLE, canAssignOthers: true })
    ).toEqual(["unassigned:", "me:me", "person:ada", "person:bo"]);
  });

  it("offers only Unassigned and Assign to me to someone who may not", () => {
    expect(
      shape({ value: null, viewerId: "me", people: PEOPLE, canAssignOthers: false })
    ).toEqual(["unassigned:", "me:me"]);
  });

  it("drops Assign to me and shows the reader's own name once they hold it", () => {
    const { options, holderFullName } = assigneeOptions({
      value: "me",
      viewerId: "me",
      people: PEOPLE,
      canAssignOthers: false,
    });
    expect(options.map((o) => `${o.kind}:${o.value}`)).toEqual(["unassigned:", "person:me"]);
    expect(options[1]).toMatchObject({ short: "Ngozi B.", full: "Ngozi Balogun" });
    expect(holderFullName).toBe("Ngozi Balogun");
  });

  it("names a colleague's row to someone who may not reassign it, without offering anyone else", () => {
    expect(
      shape({ value: "ada", viewerId: "me", people: PEOPLE, canAssignOthers: false })
    ).toEqual(["unassigned:", "me:me", "person:ada"]);
  });

  it("does not list the holder twice for someone who may name anyone", () => {
    expect(
      shape({ value: "ada", viewerId: "me", people: PEOPLE, canAssignOthers: true })
    ).toEqual(["unassigned:", "me:me", "person:ada", "person:bo"]);
  });

  it("keeps a holder the roster no longer lists, by `current` or as a dash", () => {
    const gone = { id: "gone", fullName: "Tunde Ade", email: "t@beorchid.com" };
    const withCurrent = assigneeOptions({
      value: "gone",
      current: gone,
      viewerId: "me",
      people: PEOPLE,
      canAssignOthers: false,
    });
    expect(withCurrent.options[2]).toMatchObject({ value: "gone", short: "Tunde A." });

    const without = assigneeOptions({
      value: "gone",
      viewerId: "me",
      people: PEOPLE,
      canAssignOthers: false,
    });
    expect(without.options[2]).toMatchObject({ value: "gone", short: "—", full: undefined });
  });

  it("falls back to the address for someone with no name", () => {
    const { options } = assigneeOptions({
      value: null,
      viewerId: "me",
      people: PEOPLE,
      canAssignOthers: true,
    });
    expect(options.at(-1)).toMatchObject({ short: "bo.lee", full: "bo.lee@beorchid.com" });
  });
});
