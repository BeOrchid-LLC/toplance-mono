"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Lock, Mail, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { useSignIn, useSignUp } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { AuthPanel } from "@/components/auth/auth-panel";
import { PhoneField } from "@/components/auth/phone-field";
import { useLocale } from "@/components/locale-provider";
import {
  checkInvitedEmail,
  checkSignInEmail,
  completeProfile,
  type AuthAudience,
  type SignUpIntent,
} from "@/app/[locale]/(auth)/actions";
import {
  SIGN_IN_FALLBACK,
  SIGN_UP_CREATE_FALLBACK,
  SIGN_UP_SEND_FALLBACK,
  messageForClerkError,
  type ClerkRefusal,
} from "@/lib/auth/clerk-messages";
import { isInternalPath, SIGN_IN_DOOR } from "@/lib/auth/routes";
import { splitFullName } from "@/lib/domain/name";
import { ORG_NAME_MAX } from "@/lib/domain/organisations";
import {
  isWorkEmail,
  workEmailRefusal,
  workEmailRuleEnforced,
} from "@/lib/domain/work-email";

/** Local to this component now that the server no longer returns it. */
type AuthState = {
  error?: string;
  sent?: boolean;
  email?: string;
  /**
   * Staff-only, in practice: a fresh sign-up has nothing enrolled to ask
   * for, so only a returning staff account with 2FA turned on ever
   * leaves `signIn.status` at `needs_second_factor` after the email code
   * verifies.
   */
  secondFactor?: boolean;
};

/**
 * Clerk's Future API resolves with `{ error }` instead of throwing, so
 * every call has to be checked. A try/catch around these looks like
 * error handling and silently swallows every failure.
 *
 * Turning one of these into a sentence is `@/lib/auth/clerk-messages`,
 * which is where the reasoning about Clerk's own copy lives — and where
 * it can be tested, which it could not be from inside a client component.
 */
type ClerkResult = { error: ClerkRefusal | null };

const messageFor = messageForClerkError;

/**
 * Defined by the server action that has to speak to each of them, so the
 * form and its refusals cannot drift apart over what a door is called.
 *
 * A sign-up concept only. There is one sign-in door for every role now,
 * so a sign-in has no audience to be — see `AuthFormProps`.
 */
type Audience = AuthAudience;

/**
 * A sign-up must name its `SignUpIntent`; a sign-in has nothing to
 * declare. Splitting the props into a union is what turns "this form
 * forgot to say why the account may exist" into a compile error —
 * `completeProfile` refuses to guess, and that refusal is worth catching
 * at the call site rather than in a toast after the code is spent.
 *
 * A sign-in cannot name an audience at all, and that is the type doing
 * the same job a second time. Three doors used to ask people to classify
 * themselves before they had typed anything, and the classification was
 * never used for access — roles come from `profiles`, read by `/go`
 * after the session exists. All it ever changed was the copy, which made
 * it a way to show the wrong copy to anyone who guessed wrong. One door
 * cannot guess.
 */
type AuthFormProps = { next?: string } & (
  | { mode: "sign-in" }
  | {
      mode: "sign-up";
      audience?: Audience;
      intent: SignUpIntent;
      /**
       * The address this invitation was sent to. Supplied only by the
       * invite-only door, which resolved a token to get it; every other
       * sign-up is someone choosing their own address.
       *
       * When present the email field is filled and read-only. The
       * server still decides: completeProfile enforces the match, and
       * checkInvitedEmail below still runs, because a read-only input
       * is a courtesy to the visitor and not a control over the POST.
       */
      invitedEmail?: string;
    }
);

export function AuthForm(props: AuthFormProps) {
  const mode = props.mode;
  const audience: Audience =
    props.mode === "sign-up" ? (props.audience ?? "traveller") : "traveller";
  const invitedEmail = props.mode === "sign-up" ? props.invitedEmail : undefined;
  const [state, setState] = React.useState<AuthState>({});
  const [pending, startTransition] = React.useTransition();
  const [code, setCode] = React.useState("");
  const [totpCode, setTotpCode] = React.useState("");
  const [useBackupCode, setUseBackupCode] = React.useState(false);
  const [backupCode, setBackupCode] = React.useState("");
  const { locale } = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const requested = params.get("next");
  // A sign-in resolves through `/go`, always: it cannot know who signed
  // in, and `/go` is the one place that reads the role and forwards. The
  // employer sign-up is the one door that still names its own
  // destination, because it created the organisation it is sending them
  // to and does not need to look anything up to know that.
  //
  // `props.next` wins over the query string and is never validated,
  // because it is not user input: the invite-only sign-up door derives
  // it from a token it has already resolved against the database. The
  // `isInternalPath` guard below still stands over `?next=`, which
  // anyone can type.
  const next =
    props.next ??
    (isInternalPath(requested)
      ? requested
      : mode === "sign-up" && audience === "employer"
        ? "/agency"
        : "/go");

  const { signIn } = useSignIn();
  const { signUp } = useSignUp();

  /**
   * Held from the first screen so it can be written to the profile once
   * Clerk has finished creating the account. Clerk stores the email and
   * the credential; the passport name, phone and language are ours.
   */
  const [profileFields, setProfileFields] = React.useState({
    fullName: "",
    phone: "",
    countryIso: "ng",
  });

  /**
   * The two text fields, controlled rather than read off the DOM at
   * submit time.
   *
   * `<form action={fn}>` resets an uncontrolled form once the action
   * returns — React's own behaviour, and harmless while every refusal
   * here was terminal anyway. The invitation check is not terminal: it
   * exists so the visitor can fix a typo, and a form that empties both
   * fields at the moment it asks them to correct one takes back most of
   * what the check was for. `PhoneField` already holds its own state,
   * so it survives a reset without help.
   */
  const [typed, setTyped] = React.useState({
    fullName: "",
    email: invitedEmail ?? "",
    orgName: "",
  });

  /**
   * The director's door asks for the organisation alongside the name and
   * the address, rather than on a second screen after the account
   * exists. Two forms for three facts, and the account in between
   * belonged to nobody — a director who closed the tab at that point had
   * an account with no organisation, which is the state
   * `EmployerConsolePage` still has a whole branch to recover from.
   */
  const isDirectorSignUp = mode === "sign-up" && audience === "employer";

  function onRequest(formData: FormData) {
    const email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();
    const fullName = String(formData.get("full_name") ?? "").trim();
    const countryIso = String(formData.get("country_iso") ?? "ng");
    const phone = String(formData.get("phone") ?? "");
    const org = String(formData.get("org_name") ?? "").trim();

    if (!email || !email.includes("@")) {
      setState({ error: "Enter the email address you want the code sent to." });
      return;
    }
    if (mode === "sign-up" && !fullName) {
      setState({ error: "Enter your full name as it appears in your passport." });
      return;
    }
    if (isDirectorSignUp && !org) {
      setState({
        error: "Enter the registered name of your organisation.",
      });
      return;
    }
    // Checked before Clerk is told anything, so a personal address costs
    // a corrected field rather than an account and a spent code.
    if (isDirectorSignUp && workEmailRuleEnforced() && !isWorkEmail(email)) {
      setState({ error: workEmailRefusal(email) });
      return;
    }

    setProfileFields({ fullName, phone, countryIso });

    startTransition(async () => {
      const steps: ClerkResult[] = [];

      if (mode === "sign-up") {
        if (!signUp) return;

        // Asked before Clerk is told anything, and this order is the
        // whole point. `completeProfile` refuses an address the
        // invitation does not name, but it runs after the account
        // exists and the emailed code has been spent, by which time
        // this form is gone and the visitor is being pushed to `next` —
        // so a single mistyped character used to cost a traveller the
        // only route they have into the product. Here it costs them a
        // correction. The server still enforces it; this only moves the
        // answer to where it can still be acted on.
        if (props.mode === "sign-up" && props.intent.intent === "invited") {
          const invited = await checkInvitedEmail(props.intent.token, email, locale);
          if (invited.error) {
            setState({ error: invited.error });
            toast.error(invited.error);
            return;
          }
        }

        // The name goes to Clerk at creation as well as to `profiles`
        // later: if the profile write is ever lost, `getProfile`'s lazy
        // provisioning can still recover the name from Clerk.
        //
        // Everything else the form collected rides the same rail, and
        // has to. Everything after `finalize()` is a POST from a page
        // the proxy is already walking the now-signed-in visitor off, so
        // it can be — and routinely is — cancelled in flight.
        // `completeProfile` is that POST: it is retried twice and still
        // loses, which is why `provisionInvitedProfile` carries the note
        // that phone and country "are not recoverable here". They are
        // now. Clerk's own record is the one thing that survives the
        // crossing, and the server-side provisioning spends it.
        //
        // `unsafeMetadata` is client-writable by definition. That grants
        // nothing here: every field is something this person was being
        // asked for anyway and could edit afterwards from their profile.
        // Roles are the counter-example and stay in Postgres, where
        // `getActor` is explicit they are read from; an organisation
        // name is a name, not a permission, and `createOrganisationTx`
        // still decides whether this account may own one.
        steps.push(
          await signUp.create({
            emailAddress: email,
            ...splitFullName(fullName),
            unsafeMetadata: {
              ...(org ? { orgName: org } : {}),
              ...(phone ? { phone } : {}),
              countryIso,
              locale,
            },
          })
        );
        if (!steps.at(-1)?.error) {
          steps.push(await signUp.verifications.sendEmailCode());
        }
      } else {
        if (!signIn) return;

        // Asked before Clerk is told anything, and for the reason the
        // invitation check above is asked there. Clerk holds the
        // credential; `profiles` holds the account, and since
        // `getProfile` stopped provisioning on first sight the two can
        // disagree. When they do, Clerk signs the person in perfectly
        // and every console then turns them away — they land on `/go`
        // reading that this sign-in has no Toplance account, a spent
        // code after the fact, with this form gone and nothing left to
        // correct. Here it is a wrong field and a better sentence.
        //
        // No code is sent when this refuses, which is the point: the
        // address never reaches Clerk.
        const known = await checkSignInEmail(email, locale);
        if (known.error) {
          setState({ error: known.error });
          toast.error(known.error);
          return;
        }

        steps.push(await signIn.create({ identifier: email }));
        if (!steps.at(-1)?.error) {
          steps.push(await signIn.emailCode.sendCode({ emailAddress: email }));
        }
      }

      // *Which* call failed decides how to describe it. Creating the
      // account and sending the code are two steps that fail for
      // different reasons, and a single sentence covering both reported
      // every refused sign-up as a delivery problem — which is how "you
      // already have an account" reached the screen as "check that
      // address". Sign-in keeps one sentence: its own first step is
      // pre-empted by `checkSignInEmail` above, so anything reaching here
      // is the send.
      const failedAt = steps.findIndex((s) => s.error);
      const failure = failedAt < 0 ? null : steps[failedAt].error;
      if (failure) {
        // Single-session mode: Clerk refuses to start a second sign-in
        // (or sign-up) while one session is active. The proxy redirects
        // signed-in visitors off this page, but a tab rendered before
        // the session existed elsewhere can still submit. The visitor
        // is signed in — sending them along is the only useful outcome.
        //
        // A full page load, not `router.push`, and that is the whole of
        // it. Reaching this branch means clerk-js holds a session the
        // server did not see, or the proxy would have redirected before
        // this form rendered. The only thing that closes that gap is
        // Clerk's handshake, and `isRequestEligibleForHandshake` in
        // @clerk/backend runs it for GET document navigations alone —
        // the RSC fetch behind `router.push` is not eligible, so the
        // server stays signed-out, bounces back to `/sign-in`, and the
        // visitor loops between the two forever. `assign` makes it a
        // document request, the handshake sets the session cookie, and
        // the destination renders.
        if (failure.code === "session_exists") {
          window.location.assign(next);
          return;
        }
        const fallback =
          mode === "sign-in"
            ? SIGN_IN_FALLBACK
            : failedAt === 0
              ? SIGN_UP_CREATE_FALLBACK
              : SIGN_UP_SEND_FALLBACK;
        const message = messageFor(failure, fallback);
        setState({ error: message });
        toast.error(message);
        return;
      }

      setState({ sent: true, email });
      toast.success(`Code sent to ${email}`);
    });
  }

  // `finalize` turns the completed attempt into the active session. Its
  // `navigate` callback is explicitly invoked *before* the session is
  // set, so the profile write cannot go in there — it would run
  // unauthenticated. Await the plain call instead, then write, then
  // navigate. Shared by the direct path (no second factor) and the one
  // that verifies a TOTP or backup code first.
  async function finalizeAndContinue() {
    const finalized = await (mode === "sign-up" ? signUp : signIn)?.finalize();

    if (finalized?.error) {
      const message = messageFor(
        finalized.error,
        "We verified the code but could not start your session. Try signing in again."
      );
      setState((s) => ({ ...s, error: message }));
      toast.error(message);
      return;
    }

    if (props.mode === "sign-up") {
      // Awaited here — after `finalize()`, before the `router.push()`
      // below — and that order is the whole of it. This is a POST from
      // this page: fired without being awaited, or awaited after the
      // navigation had already started, it can be cancelled in flight,
      // and the phone, country and locale are then lost. The name alone
      // survives that: `signUp.create` sent it to Clerk, and
      // `getProfile`'s lazy provisioning falls back to it.
      //
      // Tried twice for the same reason: the action is an idempotent
      // upsert, and the failure worth a second attempt is the brand-new
      // session not yet being readable by the server on the very first
      // request after `finalize()`.
      const submission = { ...profileFields, locale, ...props.intent };
      let result = await completeProfile(submission);
      if (result.error) {
        result = await completeProfile(submission);
      }

      if (result.error) {
        // Said, then carried on. The session is live and the emailed
        // code is spent, so keeping them on this screen is a dead end:
        // the form cannot be resubmitted and has nothing left to offer.
        //
        // The error is passed through as written, with nothing appended.
        // Every error this action can return — no session, no name, no
        // Clerk email, an invitation that does not name this address —
        // means no profile row was written, so "you can add it from your
        // profile" is advice to visit a page that does not exist for
        // them yet. `next` is where the explanation lives: for the
        // invite-only door that is the invitation itself, which says
        // which account they are signed in as and how to get out of it.
        toast.error(result.error);
      }

    }

    router.push(next);
  }

  function onVerify() {
    startTransition(async () => {
      const badCode =
        "That code did not work. It expires after ten minutes and can only be used once.";

      const verified =
        mode === "sign-up"
          ? await signUp?.verifications.verifyEmailCode({ code })
          : await signIn?.emailCode.verifyCode({ code });

      if (!verified) return;
      if (verified.error) {
        const message = messageFor(verified.error, badCode);
        setState((s) => ({ ...s, error: message }));
        toast.error(message);
        return;
      }

      // A staff account with 2FA enrolled leaves `signIn.status` at
      // `needs_second_factor` rather than `complete` here — everyone
      // else's email code is the whole sign-in. Sign-up can never land
      // in this branch: a brand-new account has nothing enrolled yet.
      if (mode === "sign-in" && signIn?.status === "needs_second_factor") {
        setState((s) => ({ ...s, error: undefined, secondFactor: true }));
        return;
      }

      await finalizeAndContinue();
    });
  }

  function onVerifySecondFactor() {
    startTransition(async () => {
      const badCode = useBackupCode
        ? "That backup code did not work. Each one can only be used once."
        : "That code did not work. Check your authenticator app and try again.";

      const verified = useBackupCode
        ? await signIn?.mfa.verifyBackupCode({ code: backupCode })
        : await signIn?.mfa.verifyTOTP({ code: totpCode });

      if (!verified) return;
      if (verified.error) {
        const message = messageFor(verified.error, badCode);
        setState((s) => ({ ...s, error: message }));
        toast.error(message);
        return;
      }

      await finalizeAndContinue();
    });
  }

  function onResend() {
    startTransition(async () => {
      const sent =
        mode === "sign-up"
          ? await signUp?.verifications.sendEmailCode()
          : await signIn?.emailCode.sendCode({ emailAddress: state.email ?? "" });

      if (sent?.error) {
        toast.error(
          messageFor(sent.error, "Could not send another code. Wait a moment and try again.")
        );
        return;
      }
      toast.success("New code sent.");
    });
  }

  if (state.secondFactor) {
    // Only offered once Clerk says this account actually has backup
    // codes to fall back to — `supportedSecondFactors` is populated as
    // soon as the first factor verifies, which it just did.
    const backupCodeAvailable = signIn?.supportedSecondFactors?.some(
      (f) => f.strategy === "backup_code"
    );

    return (
      <AuthPanel eyebrow="Verification" className="mx-auto w-full max-w-[440px]">
        <span className="grid size-10 place-items-center rounded-sm bg-[color-mix(in_srgb,var(--brand)_12%,var(--mix))] text-brand-text">
          <Lock className="size-5" />
        </span>
        <h1 className="d-md mt-4">
          {useBackupCode ? "Enter a backup code" : "Enter your authenticator code"}
        </h1>
        <p className="t-muted mt-2">
          {useBackupCode
            ? "One of the backup codes you saved when you set up two-factor authentication. Each one works once."
            : "This account needs a second factor. Enter the 6-digit code from your authenticator app."}
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onVerifySecondFactor();
          }}
          className="mt-6"
        >
          {useBackupCode ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="backup_code">Backup code</Label>
              <Input
                id="backup_code"
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value.trim())}
                placeholder="xxxxx-xxxxx"
                autoComplete="one-time-code"
              />
            </div>
          ) : (
            <InputOTP
              maxLength={6}
              value={totpCode}
              onChange={setTotpCode}
              aria-label="Six-digit authenticator code"
              containerClassName="justify-center"
            >
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          )}

          <Button
            type="submit"
            size="block"
            className="mt-6"
            disabled={
              pending ||
              (useBackupCode ? backupCode.length === 0 : totpCode.length !== 6)
            }
          >
            {pending ? "Checking…" : "Verify and continue"}
          </Button>
        </form>

        {backupCodeAvailable && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setUseBackupCode((v) => !v);
                setTotpCode("");
                setBackupCode("");
              }}
              className="min-h-[var(--row-h)] text-base text-brand-text hover:underline"
            >
              {useBackupCode
                ? "Use your authenticator app instead"
                : "Use a backup code instead"}
            </button>
          </div>
        )}
      </AuthPanel>
    );
  }

  if (state.sent) {
    return (
      <AuthPanel eyebrow="Verification" className="mx-auto w-full max-w-[440px]">
        <span className="grid size-10 place-items-center rounded-sm bg-[color-mix(in_srgb,var(--brand)_12%,var(--mix))] text-brand-text">
          <Mail className="size-5" />
        </span>
        <h1 className="d-md mt-4">Enter the code we emailed you</h1>
        <p className="t-muted mt-2">
          Sent to <b className="text-ink">{state.email}</b>. It expires in ten
          minutes and can be used once.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onVerify();
          }}
          className="mt-6"
        >
          <InputOTP
            maxLength={6}
            value={code}
            onChange={setCode}
            aria-label="Six-digit code"
            containerClassName="justify-center"
          >
            <InputOTPGroup>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <InputOTPSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>

          <Button
            type="submit"
            size="block"
            className="mt-6"
            disabled={pending || code.length !== 6}
          >
            {pending ? "Checking…" : "Verify and continue"}
          </Button>
        </form>

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setState({});
              setCode("");
            }}
            className="min-h-[var(--row-h)] text-base text-ink-2 hover:text-ink"
          >
            Use a different address
          </button>
          <button
            type="button"
            onClick={onResend}
            disabled={pending}
            className="min-h-[var(--row-h)] text-base text-brand-text hover:underline"
          >
            Resend code
          </button>
        </div>
      </AuthPanel>
    );
  }

  return (
    <AuthPanel
      eyebrow={
        mode === "sign-in"
          ? "Account"
          : audience === "employer"
            ? "Organisation"
            : "Traveler"
      }
      className="mx-auto w-full max-w-[560px]"
    >
      <h1 className="d-md">
        {mode === "sign-up" ? "Create your account" : "Sign in"}
      </h1>
      {/* The eyebrow names the door, and on a sign-in the door is
          everyone's — "Traveler" over a form a reviewer and a director
          also use was a label that could only ever be wrong for two of
          the three. The line below stays a sign-up line for the same
          reason: it says who a *new* account is for, which is a question
          a sign-in is not asking. */}
      {mode === "sign-up" && audience === "employer" && (
        <p className="t-muted mt-2">
          For the person managing seats and invitations at your organisation.
        </p>
      )}

      <form action={onRequest} className="mt-6 flex flex-col gap-4">
        {mode === "sign-up" && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="full_name">Full name</Label>
            <Input
              id="full_name"
              name="full_name"
              autoComplete="name"
              placeholder={
                audience === "traveller" ? "As shown in your passport" : "Full name"
              }
              value={typed.fullName}
              onChange={(e) => setTyped((t) => ({ ...t, fullName: e.target.value }))}
              required
            />
          </div>
        )}

        {/* Three facts on one form, in the order a director would say
            them: who you are, what you run, where to reach you. The
            organisation used to be asked for on a second screen after
            the account existed, which left an account belonging to
            nobody in between. */}
        {isDirectorSignUp && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="org_name">Name of organisation</Label>
            <Input
              id="org_name"
              name="org_name"
              autoComplete="organization"
              placeholder="As registered on your trading licence"
              value={typed.orgName}
              onChange={(e) => setTyped((t) => ({ ...t, orgName: e.target.value }))}
              // The same ceiling `createOrganisationTx` enforces. Without
              // it a pasted registered name could pass this form, be
              // carried through Clerk, and then be refused by the
              // transaction on the far side of a completed sign-up.
              maxLength={ORG_NAME_MAX}
              required
            />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="email">
            {isDirectorSignUp ? "Work email" : "Email"}
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder={isDirectorSignUp ? "you@youragency.com" : "you@email.com"}
            value={typed.email}
            onChange={(e) => setTyped((t) => ({ ...t, email: e.target.value }))}
            readOnly={Boolean(invitedEmail)}
            aria-readonly={Boolean(invitedEmail) || undefined}
            className={invitedEmail ? "cursor-not-allowed opacity-70" : undefined}
            required
          />
          {isDirectorSignUp && (
            <p className="t-muted text-[14px]">
              Your organisation&apos;s own address. Personal mailboxes are
              not accepted for an organisation account.
            </p>
          )}
        </div>

        {mode === "sign-up" && audience === "traveller" && (
          <PhoneField hint="Optional. Kept on your record so a reviewer can reach you — nothing is sent to it." />
        )}

        <Button type="submit" size="block" className="mt-2" disabled={pending}>
          {pending ? "Sending…" : "Continue"} <ArrowRight />
        </Button>

        {/*
          * Clerk mounts its bot check here. Without the element it falls
          * back to an invisible challenge and logs an error on every
          * sign-up; with it, a challenge can render in place when one is
          * actually needed.
          */}
        <div id="clerk-captcha" />


        {/*
          * A tinted block rather than loose red text under the button.
          * Two of the three refusals this renders are paragraph-length —
          * "there is no account for that address, here is how accounts
          * are made" — and at that length unbounded body copy in red
          * reads as damage rather than as an answer.
          *
          * The tint is `badge`'s danger variant, mixed over `--mix`
          * rather than `transparent` so the fill stays opaque against
          * the panel's own laminate; `--mix` is the page ground in both
          * themes, which is what keeps this legible in dark mode instead
          * of glowing. The icon is `upload-outcome-dialog`'s: same
          * lucide glyph, same `mt-0.5` optical nudge onto the first
          * line, `aria-hidden` because `role="alert"` already announces
          * the text and the glyph adds nothing to read aloud.
          */}
        {state.error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-md border border-[color-mix(in_srgb,var(--danger)_28%,transparent)] bg-[color-mix(in_srgb,var(--danger)_9%,var(--mix))] p-4"
          >
            <TriangleAlert
              className="mt-0.5 size-5 shrink-0 text-danger"
              aria-hidden
            />
            <p className="t-body text-danger-ink">{state.error}</p>
          </div>
        )}

        <p className="t-muted flex items-center justify-center gap-2 text-center">
          <Lock className="size-4 shrink-0" />
          Your documents are encrypted at rest and in transit.
        </p>

        <p className="t-muted text-center">
          {mode === "sign-up" ? (
            <>
              Already have an account?{" "}
              <Link
                href={SIGN_IN_DOOR}
                className="font-semibold text-brand-text hover:underline"
              >
                Sign in
              </Link>
            </>
          ) : (
            <>
              {/* The agency door, not `/sign-up`. Travellers are
                  invite-only since 2026-08-31, so `/sign-up` without a
                  token is a dead end — "create an account" pointed at a
                  page whose only answer is that you cannot. The one
                  account anyone can still make from the outside is an
                  organisation's, so the question names that audience
                  rather than sending everyone to a refusal. */}
              New to Toplance?{" "}
              <Link
                href="/agency/sign-up"
                className="font-semibold text-brand-text hover:underline"
              >
                Create an organisation account
              </Link>
              . Travelers are invited by the organisation handling their
              case.
            </>
          )}
        </p>
      </form>
    </AuthPanel>
  );
}
