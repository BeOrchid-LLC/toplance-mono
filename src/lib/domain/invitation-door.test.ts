import { describe, expect, it } from "vitest";

import { invitationDoor } from "@/lib/domain/invitation-door";

/**
 * One table carries both invitations an agency sends, and the two want
 * different doors. This is the "is this the right kind of account"
 * question only; "is this the right person" is `acceptInvitationTx`'s,
 * answered against the row it holds a lock on.
 */
describe("invitationDoor", () => {
  describe("a client invitation, which attaches a case", () => {
    it("admits a traveller", () => {
      expect(invitationDoor("traveler", "client")).toBe("accept");
    });

    it("refuses an agency member", () => {
      // They would acquire a case inside their own tenant and read their
      // own client's documents as the client.
      expect(invitationDoor("org_member", "client")).toBe("wrong-persona");
    });

    it("refuses platform staff", () => {
      expect(invitationDoor("staff", "client")).toBe("wrong-persona");
    });
  });

  describe("a platform staff invitation, which attaches a BeOrchid rank", () => {
    it("admits a traveller — a new colleague is provisioned as one", () => {
      // The invited colleague signs up through the link and is written
      // `traveler` by `provisionInvitedProfile`, exactly as an agency's
      // new hire is. `acceptInvitationTx` is what makes them staff.
      expect(invitationDoor("traveler", "platform_staff")).toBe("accept");
    });

    it("refuses an agency member", () => {
      // The v1.3 boundary, in the one direction nothing else guards. A
      // BeOrchid account that also held an agency seat would hold
      // exactly the document reach the tenancy correction removed — and
      // an invitation is not the place to decide somebody may leave
      // their agency.
      expect(invitationDoor("org_member", "platform_staff")).toBe("wrong-persona");
    });

    it("refuses platform staff, who already are what it grants", () => {
      expect(invitationDoor("staff", "platform_staff")).toBe("wrong-persona");
    });
  });

  describe("a staff invitation, which attaches a seat", () => {
    it("admits a traveller — a new colleague is provisioned as one", () => {
      // Sign-up through an invitation link writes `traveler`, and
      // `acceptInvitationTx` flips it. Refusing here would refuse every
      // new colleague the agency ever hires.
      expect(invitationDoor("traveler", "staff")).toBe("accept");
    });

    it("admits an existing agency member", () => {
      // Somebody who already works at one agency, invited to a second.
      // That is a person, not an application, and carries no case.
      expect(invitationDoor("org_member", "staff")).toBe("accept");
    });

    it("refuses platform staff", () => {
      // BeOrchid provisions agencies; it does not join them. An account
      // holding both would hold exactly the document access the v1.3
      // tenancy removed.
      expect(invitationDoor("staff", "staff")).toBe("wrong-persona");
    });
  });
});
