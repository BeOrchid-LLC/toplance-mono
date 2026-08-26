"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Lock, Mail } from "lucide-react";
import { toast } from "sonner";

import { useSignIn, useSignUp } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { AuthPanel } from "@/components/auth/auth-panel";
import { PhoneField } from "@/components/auth/phone-field";
import { useLocale } from "@/components/locale-provider";
import { completeProfile } from "@/app/(auth)/actions";
import { isInternalPath } from "@/lib/auth/routes";

type Mode = "sign-up" | "sign-in";

/** Local to this component now that the server no longer returns it. */
type AuthState = { error?: string; sent?: boolean; email?: string };

/**
 * Clerk's Future API resolves with `{ error }` instead of throwing, so
 * every call has to be checked. A try/catch around these looks like
 * error handling and silently swallows every failure.
 *
 * `longMessage` is the string Clerk intends for users; `message` is for
 * developers and is explicitly not stable. Where neither fits the
 * situation we say it in our own words instead.
 */
type ClerkResult = { error: { code: string; longMessage?: string } | null };

function messageFor(error: NonNullable<ClerkResult["error"]>, fallback: string) {
  return error.longMessage ?? fallback;
}

export function AuthForm({
  mode,
  audience = "traveller",
}: {
  mode: Mode;
  audience?: "traveller" | "employer" | "operations";
}) {
  const [state, setState] = React.useState<AuthState>({});
  const [pending, startTransition] = React.useTransition();
  const [code, setCode] = React.useState("");
  const { locale } = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const requested = params.get("next");
  const next = isInternalPath(requested)
    ? requested
    : audience === "employer" ? "/employer" : audience === "operations" ? "/ops" : "/app";

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

  function onRequest(formData: FormData) {
    const email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();
    const fullName = String(formData.get("full_name") ?? "").trim();
    const countryIso = String(formData.get("country_iso") ?? "ng");
    const phone = String(formData.get("phone") ?? "");

    if (!email || !email.includes("@")) {
      setState({ error: "Enter the email address you want the code sent to." });
      return;
    }
    if (mode === "sign-up" && !fullName) {
      setState({ error: "Enter your full name as it appears in your passport." });
      return;
    }

    setProfileFields({ fullName, phone, countryIso });

    startTransition(async () => {
      // Sign-in must not quietly create an account for a typo'd
      // address, so the two modes fail differently on purpose.
      const fallback =
        mode === "sign-in"
          ? "We could not find an account for that address. Create one instead."
          : "We could not send a code to that address. Check it and try again.";

      const steps: ClerkResult[] = [];

      if (mode === "sign-up") {
        if (!signUp) return;
        steps.push(await signUp.create({ emailAddress: email }));
        if (!steps.at(-1)?.error) {
          steps.push(await signUp.verifications.sendEmailCode());
        }
      } else {
        if (!signIn) return;
        steps.push(await signIn.create({ identifier: email }));
        if (!steps.at(-1)?.error) {
          steps.push(await signIn.emailCode.sendCode({ emailAddress: email }));
        }
      }

      const failure = steps.find((s) => s.error)?.error;
      if (failure) {
        // Single-session mode: Clerk refuses to start a second sign-in
        // (or sign-up) while one session is active. The proxy redirects
        // signed-in visitors off this page, but a tab rendered before
        // the session existed elsewhere can still submit. The visitor
        // is signed in — sending them along is the only useful outcome.
        if (failure.code === "session_exists") {
          router.push(next);
          return;
        }
        const message = messageFor(failure, fallback);
        setState({ error: message });
        toast.error(message);
        return;
      }

      setState({ sent: true, email });
      toast.success(`Code sent to ${email}`);
    });
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

      // `finalize` turns the completed attempt into the active session.
      // Its `navigate` callback is explicitly invoked *before* the
      // session is set, so the profile write cannot go in there — it
      // would run unauthenticated. Await the plain call instead, then
      // write, then navigate.
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

      if (mode === "sign-up") {
        const result = await completeProfile({ ...profileFields, locale });
        if (result.error) {
          toast.error(result.error);
          return;
        }
      }

      router.push(next);
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
        audience === "employer"
          ? "Organisation"
          : audience === "operations"
            ? "Toplance operations"
            : "Traveller"
      }
      className="mx-auto w-full max-w-[560px]"
    >
      <h1 className="d-md">
        {mode === "sign-up" ? "Create your account" : "Sign in"}
      </h1>
      {audience !== "traveller" && (
        <p className="t-muted mt-2">
          {audience === "employer"
            ? "For the person managing seats and invitations at your organisation."
            : "Toplance operations staff only. Every document view is recorded against your account."}
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
              placeholder="As shown in your passport"
              required
            />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@email.com"
            required
          />
        </div>

        {mode === "sign-up" && audience === "traveller" && (
          <PhoneField hint="Used for the voice agent and travel alerts. You can turn both off later." />
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


        {state.error && (
          <p role="alert" className="text-base text-danger-ink">
            {state.error}
          </p>
        )}

        <p className="t-muted flex items-center justify-center gap-2 text-center">
          <Lock className="size-4 shrink-0" />
          Your documents are encrypted at rest and in transit.
        </p>

        {(audience === "traveller" || audience === "employer") && (
          <p className="t-muted text-center">
            {mode === "sign-up" ? (
              <>
                Already have an account?{" "}
                <Link
                  href={audience === "employer" ? "/employer/sign-in" : "/sign-in"}
                  className="font-semibold text-brand-text hover:underline"
                >
                  Sign in
                </Link>
              </>
            ) : (
              <>
                New to Toplance?{" "}
                <Link
                  href={audience === "employer" ? "/employer/sign-up" : "/sign-up"}
                  className="font-semibold text-brand-text hover:underline"
                >
                  Create an account
                </Link>
              </>
            )}
          </p>
        )}
      </form>
    </AuthPanel>
  );
}
