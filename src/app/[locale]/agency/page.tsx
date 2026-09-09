import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import {
  ArrowRight,
  ChevronDown,
  FolderOpen,
  Inbox,
  Mail,
  Shield,
  UsersRound,
  Wallet,
} from "lucide-react";
import { eq } from "drizzle-orm";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Panel, PanelBody, PanelHeader } from "@/components/shared/panel";
import { CreateOrganisation } from "@/components/agency/create-organisation";
import { KpiRow, type Kpi } from "@/components/shared/kpi-card";
import { FunnelBars } from "@/components/shared/funnel-bars";
import { BillChart } from "@/components/agency/bill-chart";
import { ClientFeeChart } from "@/components/agency/client-fee-chart";
import { AgencyShell } from "@/components/agency/agency-shell";
import { ClientRoster } from "@/components/agency/client-roster";
import type { Actor } from "@/lib/auth/policy";
import { homeFor } from "@/lib/auth/routes";
import { createOrganisationTx } from "@/lib/data/organisations";
import { db, hasDatabaseEnv } from "@/lib/db/client";
import { applications } from "@/lib/db/schema";
import { readPendingProfile } from "@/lib/domain/pending-profile";
import { SetupNotice } from "@/components/shared/setup-notice";
import { listInvitations } from "@/lib/data/invitations";
import {
  countOrgClients,
  countOrgClientsByStatus,
  listOrgMembers,
  listOrgRoster,
} from "@/lib/data/organisations";
import { agencyDashboard } from "@/lib/data/agency-dashboard";
import { formatMoney } from "@/lib/domain/pricing";
import { getLocale } from "@/lib/i18n/server";
import { AGENCY } from "@/lib/i18n/agency";
import { fill } from "@/lib/i18n/fill";
import { resolveAgencyConsole } from "@/app/[locale]/agency/console";

// Reads a session, so it is never prerendered.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: AGENCY.pageTitle[locale] };
}

/**
 * Why the account carries that role, said where the role is shown — see
 * `AGENCY.roleReason`.
 */
const ROLE_REASON = AGENCY.roleReason;

/**
 * One of the two rosters, as a card that says how big it is and opens
 * it. The console's front page is a summary now that the roster and the
 * team each have a route of their own — the counts here are the only
 * thing this page can honestly say about two lists it no longer holds.
 */
function RosterCard({
  href,
  label,
  body,
  count,
  countWord,
}: {
  href: string;
  label: string;
  body: string;
  count: number;
  countWord: string;
}) {
  return (
    <Link href={href} className="group block rounded-lg">
      <Panel className="h-full transition-colors group-hover:border-border-strong">
        <PanelHeader
          label={label}
          // The arrow rather than a second "People" under the body: the
          // card is one link, and naming the destination twice inside it
          // reads as two.
          aside={
            <span className="flex items-center gap-3">
              <Badge variant="brand">
                <span className="num">{count}</span>
                {countWord}
              </Badge>
              <ArrowRight
                className="size-5 shrink-0 text-brand-text transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </span>
          }
        />
        <PanelBody>
          <p className="t-muted max-w-[62ch]">{body}</p>
        </PanelBody>
      </Panel>
    </Link>
  );
}

/**
 * The agency in numbers: how many clients it holds, who works here, what
 * is outstanding.
 *
 * Counts, not contents. The rows themselves are rendered by
 * `/agency/clients` and `/agency/team`; what this page needs from each
 * list is its length, and `countOrgClients` is that question asked as a
 * `count(*)` rather than by reading a roster in order to measure it.
 *
 * The client count is the agency's rather than the viewer's: it is a
 * figure about the business, and one that must not read differently
 * depending on which colleague is logged in.
 */
async function directorSummary(orgIds: readonly string[], orgId: string | null) {
  const [used, byStatus, members, invitations, charts] = await Promise.all([
    countOrgClients(orgIds),
    countOrgClientsByStatus(orgIds),
    // Same "no org, no unfiltered read" reasoning as the roster: both of
    // these take one org id and have nothing to filter by without it.
    orgId ? listOrgMembers(orgId) : Promise.resolve([]),
    orgId ? listInvitations(orgId) : Promise.resolve([]),
    // The funnel and the bill. In the same `Promise.all` rather than
    // awaited after it: these are the two slowest reads on the page and
    // running them behind the four counts above would make the console's
    // front page wait for its own summary twice.
    agencyDashboard(orgIds, orgId),
  ]);

  return {
    used,
    byStatus,
    members,
    pendingInvitations: invitations.filter((i) => i.status === "pending"),
    charts,
  };
}

/**
 * One reviewer's desk: the cases they hold, and the ones anybody at the
 * agency may still take.
 *
 * Both lists are the same rows the clients page shows — this is not a
 * second source of truth, it is the same query with `assignee_id` in the
 * `where`. The pool is here rather than only on the clients page because
 * an empty desk needs somewhere to go next, and taking a case is that
 * step: `handlesCase` refuses an unheld case to everyone but the
 * director, and `canAssignCase` is what lets a reviewer claim one
 * anyway.
 */
async function reviewerDesk(actor: Actor) {
  const [assigned, unclaimed] = await Promise.all([
    listOrgRoster(actor, { handledBy: actor.userId }),
    listOrgRoster(actor, { unclaimed: true }),
  ]);

  return { assigned, unclaimed };
}

export default async function EmployerConsolePage() {
  if (!hasDatabaseEnv) return <SetupNotice />;

  const locale = await getLocale();

  // Identity, role and membership — the preamble every page under
  // `/agency` shares, and the redirects that go with it.
  const { profile, actor, membership, orgId } = await resolveAgencyConsole();

  // No org row for this person yet — sign-up created the account but
  // not the organisation, or seed data never ran. The roster, seat
  // count and privacy laminate below all assume an organisation exists;
  // rendering them here would either crash on `org.name` or show a
  // "0 people" roster for an org that was never created. This is the
  // only door in: name one, then the branch below takes over.
  if (!membership) {
    // The organisation the director named on the sign-up form, finished
    // here rather than there.
    //
    // Everything after Clerk's `finalize()` is a POST from a page the
    // proxy is already walking the newly signed-in visitor off, so it
    // gets cancelled in flight often enough to be the normal case, not
    // the edge one — which is why `completeProfile` is retried and why
    // `recoverEmployer` in `console.ts` exists at all. A client call to
    // `createOrganisation` sat in exactly that gap and lost the name.
    //
    // So the name crosses inside Clerk's own record, and the first
    // server render that finds no membership spends it. Idempotent by
    // construction: `createOrganisationTx` locks the profile row and
    // refuses a second organisation, so a double render cannot make two.
    const { orgName } = readPendingProfile((await currentUser())?.unsafeMetadata);
    let pendingOrgError: string | null = null;
    if (orgName) {
      const created = await createOrganisationTx(profile.id, orgName);
      // Straight back through the front door, so the roster below reads
      // the membership this just wrote rather than a stale `undefined`.
      if (!("error" in created)) redirect("/agency");
      // Kept, not swallowed. This branch used to drop the refusal on the
      // floor: a director whose registered name ran past `NAME_MAX`
      // signed up successfully, landed here, and was shown a blank
      // "Name of organisation" form with no sign that what they had
      // already typed was rejected, or why. The form below says it.
      pendingOrgError = created.error;
    }

    // …but not everyone holding a session belongs at that door. Since
    // travellers became invite-only (2026-08-31) a new employer arrives
    // already holding `org_member`, written by `completeProfile` — but
    // the membership row still begins in `createOrganisationTx`, so the
    // role alone cannot decide who belongs here.
    //
    // Staff are already gone by this point. What is left to refuse is
    // the account `createOrganisationTx` refuses anyway, rather than
    // hand it a form guaranteed to fail at submit: a traveller already
    // mid-case, whose account is committed to the other side of the
    // privacy boundary. Keep this in step with that transaction — a
    // rule relaxed there and not here shows a dead form; the reverse
    // hides a live one.
    const [ownCase] = await db
      .select({ id: applications.id })
      .from(applications)
      .where(eq(applications.travelerId, profile.id))
      .limit(1);
    if (ownCase) redirect(homeFor("traveler"));

    return (
      <AgencyShell
        profile={profile}
        membership={null}
        actor={actor}
        orgId={orgId}
        locale={locale}
        activeId="overview"
      >
        <Panel className="mx-auto max-w-[560px]">
          {/* "Name of", not "Name your". The field asks for the
              registered name of a licensed travel agency, which is a
              fact to be matched against a register — "name your
              organisation" invites a label the director makes up. */}
          <PanelHeader label={AGENCY.nameOrgLabel[locale]} />
          <PanelBody>
            <p className="t-muted max-w-[62ch]">
              {AGENCY.nameOrgBody[locale]}
            </p>
            {/* Why the name they already gave did not take. Said
                here rather than as a toast: this render is the first
                thing they see after sign-up, and a toast fired
                during it would be gone before they had read the
                form. */}
            {pendingOrgError && (
              <p
                role="alert"
                className="t-body mt-4 max-w-[62ch] text-danger-ink"
              >
                {pendingOrgError}
              </p>
            )}
            <div className="mt-6">
              <CreateOrganisation defaultName={orgName ?? ""} />
            </div>
          </PanelBody>
        </Panel>
      </AgencyShell>
    );
  }

  const org = membership;
  const isDirector = org.role === "owner";

  // A director's dashboard answers "how is the agency doing"; a
  // reviewer's answers "what is on my desk". Two different questions, so
  // neither pays for the other's queries — and a reviewer never runs the
  // agency-wide roster read at all.
  const summary = isDirector ? await directorSummary(actor.orgIds, orgId) : null;
  const desk = isDirector ? null : await reviewerDesk(actor);

  const used = summary?.used ?? 0;

  /**
   * A funnel stage's name in the reader's language.
   *
   * `funnelOf` carries BeOrchid's own English label on every stage,
   * which is right for `/ops` and wrong here. Falling back to it rather
   * than to `undefined` means a stage added to `FUNNEL_STAGES` without a
   * translation shows English on this screen instead of the word
   * "undefined" — worse than translated, better than broken.
   */
  const funnelLabel = (stage: { key: string; label: string }) =>
    AGENCY.funnel[stage.key as keyof typeof AGENCY.funnel]?.[locale] ??
    stage.label;

  /**
   * The cycle now running. Last, because `agencyDashboard` sorts oldest
   * first for the chart's benefit — and `undefined` for an agency whose
   * first cycle has not opened, which is what hides the header figure
   * rather than printing a confident $0.00.
   */
  const thisCycle = summary?.charts.invoices.at(-1);

  const counters: Kpi[] = summary
    ? [
        {
          label: AGENCY.kpi.clients.label[locale],
          value: String(summary.used),
          sub: AGENCY.kpi.clients.sub[locale],
          icon: UsersRound,
          href: "/agency/clients",
          tone: "neutral",
        },
        {
          label: AGENCY.kpi.awaitingReview.label[locale],
          value: String(summary.byStatus.submitted ?? 0),
          sub: AGENCY.kpi.awaitingReview.sub[locale],
          icon: Inbox,
          href: "/agency/clients?status=submitted",
          tone: (summary.byStatus.submitted ?? 0) > 0 ? "warning" : "neutral",
        },
        {
          label: AGENCY.kpi.withHandler.label[locale],
          value: String(summary.byStatus.under_review ?? 0),
          sub: AGENCY.kpi.withHandler.sub[locale],
          icon: FolderOpen,
          href: "/agency/clients?status=under_review",
          tone: "info",
        },
        {
          label: AGENCY.kpi.invitations.label[locale],
          value: String(summary.pendingInvitations.length),
          sub: AGENCY.kpi.invitations.sub[locale],
          icon: Mail,
          tone: "neutral",
        },
        {
          /*
             What this agency's clients have paid for their own
             applications — settled fees only, so it is money that
             arrived rather than money that was asked for.

             Not a door. `/agency/billing` is the agency's own bill from
             Toplance, which is the opposite side of a different ledger,
             and sending a director there from this figure would answer
             a question they did not ask. There is no per-client payment
             view to link to yet, so this card does not pretend there is
             (see the `href` note on `Kpi`).
          */
          label: AGENCY.kpi.clientsPaid.label[locale],
          value: formatMoney(
            summary.charts.clientRevenue.totalMinor,
            summary.charts.clientRevenue.currency
          ),
          sub: summary.charts.clientRevenue.mixedCurrency
            ? AGENCY.kpi.clientsPaid.mixed[locale]
            : AGENCY.kpi.clientsPaid.sub[locale],
          icon: Wallet,
          tone: "success",
        },
      ]
    : [];

  return (
    <AgencyShell
      profile={profile}
      membership={org}
      actor={actor}
      orgId={orgId}
      locale={locale}
      activeId="overview"
      // The agency's own name, as it was in the band this replaced.
      // The rail carries it too, but as chrome — `AdminSidebar` renders
      // its title as a `p`, so making "Dashboard" the heading left the
      // organisation's name as a heading on no screen at all, which is
      // what `agency.spec` and `pricing.spec` both caught.
      title={org.name || AGENCY.yourOrganisationFallback[locale]}
    >
      {/* What the rest of the band above the page used to carry. */}
      <div className="mb-8">
        {/*
          How many people work here. It is the one fact this page has
          that no card below repeats and no rail badge carries — the
          Team badge counts pending invitations, not colleagues.

          What stood here until 2026-09-09 was "{n} people · seat count
          not set yet · {n} invitation pending", whose three clauses
          were each wrong or redundant: "people" read
          `countOrgClients`, which counts applications; the seat clause
          named a cap nothing in the product enforces; and the
          invitation clause repeated the card directly beneath it.
        */}
        {summary && (
          <p className="t-muted mt-2">
            {summary.members.length === 1
              ? AGENCY.teamSizeOne[locale]
              : fill(AGENCY.teamSizeOther[locale], { n: summary.members.length })}
          </p>
        )}
        {/* The rail names your role; this says how you got it.
            Seeing "Director" appended to your account without ever
            having chosen it is the kind of thing that reads as the
            product knowing something about you that you don't.

            No 68ch cap. This is the block under the page title, read
            once on the way past, and capped it wrapped into three lines
            of a narrow column with the page empty to its right —
            pushing the figures down for no reading benefit. Same
            complaint the client made about headers on 8 September, in
            the one place the fix had not reached. `text-pretty` so the
            lines it does take break evenly rather than leaving one word
            alone. */}
        <p className="t-muted mt-2 text-pretty">{ROLE_REASON[org.role][locale]}</p>
        {/* Every figure below is the agency's, for a director and a
            handler alike. Until the role-based split lands, the page
            has to say so — otherwise a handler reads the agency's
            forty open cases as their own. */}
        <p className="t-muted mt-2 text-pretty">{AGENCY.overviewIsAgencyWide[locale]}</p>
      </div>


      {/*
        One rhythm for the whole page, rather than an `mt-8` on some
        blocks and nothing on others. The laminate and the figure cards
        used to be adjacent siblings with no margin between them, so the
        console's most emphatic panel ran straight into the first row of
        numbers with no air at all — and every block below it set its own
        spacing, which is how that gap survived three screens' worth of
        additions. `space-y-8` here means a panel added later inherits
        the spacing instead of having to remember it.
      */}
      <div className="space-y-8">
        {/*
          The signature moment for this console, per guideline §4, and
          still the right one — though no longer for the reason it was
          written. It used to promise the reader that this screen would
          never show them a passport; v1.3 moved the review boundary to
          the agency, so now it does. What a director most needs to
          believe is therefore no longer "not me" but "not anyone
          else": nobody at BeOrchid can open these documents, and
          inside their own agency a claimed case narrows to its handler
          and to them. One laminate, on the page you land on, and none
          below it — which is also why the two roster pages do not
          repeat it.

          No MRZ. The mark carries a corridor, and this screen is a
          roster of many — there is no one corridor here to encode.
        */}
        {/* Collapsible, and the paragraph takes the width it has.
            The client asked for both on 8 September: the strip is the
            first thing on the page every visit, it says the same thing
            every visit, and capped at 74ch it wrapped into a tall
            column that pushed the figures below the fold.

            A `<details>` rather than state, so it works before any
            JavaScript arrives and so the heading — the half worth
            re-reading — is what stays visible when it is shut. Open by
            default: a promise about somebody's passport should be read
            once before it can be put away. */}
        <details open className="laminate group overflow-hidden rounded-lg">
          <span aria-hidden className="laminate-sheen" />
          {/* `list-none` covers most engines; WebKit needs its own marker
              turned off too, or the chevron below is the second
              disclosure mark on the row. */}
          <summary className="relative z-[1] flex cursor-pointer list-none items-start gap-4 p-6 [&::-webkit-details-marker]:hidden">
            <Shield className="mt-0.5 size-6 shrink-0 text-brand-text" aria-hidden />
            {/* `me-auto` on the text rather than a wrapper around it, the
                same way `DisclosurePanel` keeps its aside at the edge. */}
            <div className="me-auto min-w-0">
              <p className="tag">{AGENCY.privacyTag[locale]}</p>
              <p className="d-sm mt-2 text-ink">{AGENCY.privacyHeading[locale]}</p>
            </div>
            {/* Down when shut, up when open — the strip opens by default,
                so the mark a director meets first is the one that says
                this can be put away. Rotated rather than swapped for a
                second icon so the turn is animated, and on the vertical
                axis rather than `DisclosurePanel`'s `ChevronRight`,
                which would point into the text in Arabic.

                `aria-hidden`: `<summary>` already carries the expanded
                state, and a second announcement of it is noise. */}
            <ChevronDown
              className="mt-0.5 size-4 shrink-0 text-ink-3 transition-transform duration-[var(--dur-toggle)] ease-[var(--ease-out)] group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <div className="relative z-[1] px-6 pb-6 ps-16">
            <p className="t-muted">{AGENCY.privacyBody[locale]}</p>
          </div>
        </details>

        {/* Doors, not decoration. Three of the four open the roster
            already filtered to exactly the rows the figure counted, which
            is what the client asked these cards to do; the fourth is a
            tile, because the invitations it counts are a panel on that
            page rather than a view of their own, and a card that looks
            clickable and goes nowhere is worse than one that never
            offered (guideline §7). No trend deltas anywhere — §7 again:
            this product has no history to compare against yet. */}
        {summary && <KpiRow items={counters} />}

        {/*
          The two questions the cards above cannot answer: where the
          agency's cases get stuck, and what the agency is being charged
          for them. Side by side because they are the same size of
          question — neither is the headline, and stacking one over the
          other would say it was.

          Director only, like everything else fed by `summary`. A reviewer
          is not managing the account, and their desk below is the screen
          they came for.
        */}
        {summary && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel>
              <PanelHeader
                label={AGENCY.pipelineTitle[locale]}
                // The one figure here somebody can act on today, so it
                // sits in the header rather than being left to be
                // inferred from the gap between two bars.
                aside={
                  summary.charts.stalled > 0 ? (
                    <Badge variant="warning">
                      {fill(AGENCY.pipelineStalled[locale], {
                        n: summary.charts.stalled,
                      })}
                    </Badge>
                  ) : undefined
                }
              />
              <PanelBody>
                {summary.charts.funnel[0].count === 0 ? (
                  <p className="t-muted max-w-[62ch]">
                    {AGENCY.pipelineEmpty[locale]}
                  </p>
                ) : (
                  <FunnelBars
                    stages={summary.charts.funnel.map((stage) => ({
                      ...stage,
                      label: funnelLabel(stage),
                    }))}
                    ofPreviousLabel={(share) =>
                      fill(AGENCY.pipelineOfPrevious[locale], { pct: share })
                    }
                  />
                )}
              </PanelBody>
            </Panel>

            <Panel>
              <PanelHeader
                label={AGENCY.billTitle[locale]}
                // What this cycle has run up so far. The chart's last bar
                // says the same thing, but a director opening this panel
                // is asking the number, not reading it off an axis.
                aside={
                  thisCycle ? (
                    <span className="flex items-baseline gap-2">
                      <span className="special">
                        {AGENCY.billThisCycle[locale]}
                      </span>
                      <span className="num font-semibold">
                        {formatMoney(thisCycle.amountMinor, thisCycle.currency)}
                      </span>
                    </span>
                  ) : undefined
                }
              />
              <PanelBody className="px-2 sm:px-3">
                <BillChart
                  invoices={summary.charts.invoices}
                  locale={locale}
                  copy={{
                    empty: AGENCY.billEmpty[locale],
                    charged: AGENCY.billCharged[locale],
                    baseFee: AGENCY.billBaseFee[locale],
                    perCase: AGENCY.billPerCase[locale],
                    cases: AGENCY.billCases[locale],
                    status: {
                      paid: AGENCY.billStatus.paid[locale],
                      draft: AGENCY.billStatus.draft[locale],
                      open: AGENCY.billStatus.open[locale],
                      failed: AGENCY.billStatus.failed[locale],
                    },
                  }}
                />
              </PanelBody>
            </Panel>
          </div>
        )}

        {/*
          Full width and below the pair, not a third column in it.

          Two reasons, and the layout one is the weaker: three panels in a
          two-column grid leaves a hole. The other is that this chart is
          not the same *kind* of question as the two above it. Those are
          the agency's own operation — where its cases stick, what it is
          charged. This is money that moved between a traveller and
          BeOrchid on cases the agency happens to be handling, which is
          worth knowing and is not the agency's ledger. Sitting it beside
          the bill would invite exactly the subtraction nobody should do.

          Hence `clientFeesNote` under the heading rather than in a
          tooltip. A director who reads only the panel title must still
          come away with the right idea of whose money this is.
        */}
        {summary && (
          <Panel>
            <PanelHeader
              label={AGENCY.clientFeesTitle[locale]}
              aside={
                <span className="special">{AGENCY.clientFeesWindow[locale]}</span>
              }
            />
            <PanelBody className="px-2 sm:px-3">
              {/* `px-3` against the body's reduced `px-2 sm:px-3`: this panel
                  gives its padding to the chart, and prose sitting flush
                  against the panel edge reads as a caption that fell off. */}
              <p className="t-muted mb-4 max-w-[74ch] px-3">
                {AGENCY.clientFeesNote[locale]}
              </p>
              <ClientFeeChart
                points={summary.charts.clientFees.points}
                currency={summary.charts.clientFees.currency}
                totalMinor={summary.charts.clientFees.totalMinor}
                mixedCurrency={summary.charts.clientFees.mixedCurrency}
                locale={locale}
                copy={{
                  empty: AGENCY.clientFeesEmpty[locale],
                  paid: AGENCY.clientFeesPaid[locale],
                  cases: AGENCY.clientFeesCases[locale],
                  mixedCurrency: AGENCY.clientFeesMixed[locale],
                }}
              />
            </PanelBody>
          </Panel>
        )}

        {summary ? (
          /* The two rosters, as the doors to their own pages. Equal
             weight on purpose: an agency is its clients and the people
             who serve them, and the console used to show only the
             first. */
          <div className="grid gap-6 md:grid-cols-2">
            <RosterCard
              href="/agency/clients"
              label={AGENCY.navClients[locale]}
              body={AGENCY.clientsCardBody[locale]}
              count={used}
              countWord={(used === 1 ? AGENCY.clientWord : AGENCY.clientsWord)[locale]}
            />
            <RosterCard
              href="/agency/team"
              label={AGENCY.navTeam[locale]}
              body={AGENCY.teamCardBody[locale]}
              count={summary.members.length}
              countWord={
                (summary.members.length === 1
                  ? AGENCY.memberWord
                  : AGENCY.membersWord)[locale]
              }
            />
          </div>
        ) : (
          /* A reviewer's desk, not a summary of somebody else's
             agency. Their own cases first — the ones they can actually
             open — then the pool, because an empty desk needs a next
             step and taking a case is that step. Only the first list
             links into the case screen: a client nobody has taken is
             a name and a completion score here, and nothing more,
             until somebody takes it. */
          <div>
            <ClientRoster
              rows={desk?.assigned ?? []}
              locale={locale}
              label={AGENCY.assignedToYou[locale]}
              empty={AGENCY.assignedEmpty[locale]}
            />
            <ClientRoster
              className="mt-8"
              rows={desk?.unclaimed ?? []}
              locale={locale}
              label={AGENCY.unclaimedLabel[locale]}
              empty={AGENCY.unclaimedEmpty[locale]}
              // Takeable, not openable: a reviewer may claim one of
              // these but cannot read it until they have — see
              // `handlesCase`.
              takeableBy={profile.id}
            />
          </div>
        )}
      </div>
    </AgencyShell>
  );
}
