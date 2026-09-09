import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { AgencyShell } from "@/components/agency/agency-shell";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { SetupNotice } from "@/components/shared/setup-notice";
import { hasDatabaseEnv } from "@/lib/db/client";
import { AGENCY_VERIFICATION } from "@/lib/i18n/agency-verification";
import { getLocale } from "@/lib/i18n/server";
import { resolveAgencyConsole } from "@/app/[locale]/agency/console";

// Reads a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: AGENCY_VERIFICATION.title[locale] };
}

/**
 * Where an agency waits while BeOrchid decides whether to let it in.
 *
 * `allowPending` is the whole reason this page resolves the console
 * itself rather than calling `requireAgencyConsole`: the KYB gate lives
 * in the resolver, so without it this screen would redirect to itself —
 * exactly the loop `/agency/billing` documents for `allowUnpaid`.
 *
 * It does **not** pass `allowUnpaid`, and that is deliberate rather than
 * an oversight. An agency that has been activated and has not paid
 * belongs on the billing screen, so leaving the paywall live here means
 * this page cannot become a way to sit in a verified state forever.
 *
 * The checklist is not on it. The director sees that we are working and
 * how to reach us, and nothing about which of the six documents is
 * outstanding: they cannot upload one here this milestone, so naming it
 * would produce an email either way — and a `rejected` row shown to
 * somebody with no control to answer it is a worse screen than one that
 * says less.
 */
export default async function AgencyVerificationPage() {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const locale = await getLocale();
  const { profile, actor, membership, orgId, kybActivated } =
    await resolveAgencyConsole({ allowPending: true });

  // No organisation, nothing to verify. `/agency` is where that state is
  // explained and where it is fixed.
  if (!membership || !orgId) redirect("/agency");

  // Already through. Not a state a link leads to, but a bookmark from
  // the waiting week is — and it must land on the console rather than on
  // a screen saying we are still deciding.
  if (kybActivated) redirect("/agency");

  const supportEmail = process.env.SUPPORT_EMAIL?.trim();

  return (
    <AgencyShell
      profile={profile}
      membership={membership}
      actor={actor}
      orgId={orgId}
      locale={locale}
      activeId="overview"
      title={AGENCY_VERIFICATION.title[locale]}
      centred
    >
      <Panel>
        <PanelHeader
          label={AGENCY_VERIFICATION.heading[locale].replace(
            "{agency}",
            membership.name
          )}
          aside={<ShieldCheck className="size-5 text-ink-3" aria-hidden />}
        />
        <PanelBody className="flex flex-col gap-4 pt-6">
          <p className="max-w-[60ch] text-[15px] text-ink-2">
            {AGENCY_VERIFICATION.body[locale]}
          </p>

          {/* Omitted rather than printed with a placeholder address. A
              screen telling a paying customer to write to
              "support@example.com" is worse than one that does not
              offer. */}
          {supportEmail && (
            <p className="t-muted max-w-[60ch]">
              {AGENCY_VERIFICATION.contact[locale]
                .split("{email}")
                .flatMap((part, index) =>
                  index === 0
                    ? [part]
                    : [
                        <a
                          key="email"
                          href={`mailto:${supportEmail}`}
                          className="text-brand-text hover:underline"
                        >
                          {supportEmail}
                        </a>,
                        part,
                      ]
                )}
            </p>
          )}
        </PanelBody>
      </Panel>
    </AgencyShell>
  );
}
