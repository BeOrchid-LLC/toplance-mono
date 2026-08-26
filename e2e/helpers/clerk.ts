import { loadEnvLocal } from "./env";

loadEnvLocal();

const API = "https://api.clerk.com/v1";

/**
 * Clerk holds the account; Postgres holds everything else about the
 * person. Clearing only the profile row would leave the next run unable
 * to sign the same address up again ("that email address is taken"), so
 * a reset has to reach both sides — this is the Clerk half.
 *
 * The Backend API over plain `fetch`, the same stance `sendEmail` takes
 * with Resend: one function against a documented endpoint rather than a
 * dependency the app itself does not have.
 */
export async function deleteClerkUsers(emails: string[]): Promise<void> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      "CLERK_SECRET_KEY is not set. The e2e suite signs real accounts into the Clerk dev instance — check .env.local."
    );
  }
  if (secretKey.startsWith("sk_live_")) {
    throw new Error(
      "CLERK_SECRET_KEY is a production key. This suite creates and deletes users — point it at the development instance."
    );
  }

  const query = emails.map((email) => `email_address=${encodeURIComponent(email)}`).join("&");
  const headers = { Authorization: `Bearer ${secretKey}` };

  const response = await fetch(`${API}/users?${query}&limit=100`, { headers });
  if (!response.ok) {
    throw new Error(
      `Clerk user lookup failed (${response.status}): ${await response.text()}`
    );
  }

  const users = (await response.json()) as { id: string }[];

  for (const user of users) {
    const deleted = await fetch(`${API}/users/${user.id}`, { method: "DELETE", headers });
    // A 404 is the state this function is trying to reach, so it is not
    // a failure.
    if (!deleted.ok && deleted.status !== 404) {
      throw new Error(
        `Deleting Clerk user ${user.id} failed (${deleted.status}): ${await deleted.text()}`
      );
    }
  }
}
