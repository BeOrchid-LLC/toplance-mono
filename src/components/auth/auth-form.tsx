"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Lock, Mail } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { PhoneField } from "@/components/auth/phone-field";
import { useLocale } from "@/components/locale-provider";
import { requestCode, verifyCode, type AuthState } from "@/app/(auth)/actions";

type Mode = "sign-up" | "sign-in";

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
  const next =
    params.get("next") ??
    (audience === "employer" ? "/employer" : audience === "operations" ? "/ops" : "/app");

  function onRequest(formData: FormData) {
    formData.set("mode", mode);
    formData.set("locale", locale);
    startTransition(async () => {
      const result = await requestCode({}, formData);
      setState(result);
      if (result.error) toast.error(result.error);
      if (result.sent) toast.success(`Code sent to ${result.email}`);
    });
  }

  function onVerify(formData: FormData) {
    formData.set("email", state.email ?? "");
    formData.set("token", code);
    formData.set("next", next);
    startTransition(async () => {
      const result = await verifyCode({}, formData);
      // A successful verify redirects, so reaching here means it failed.
      if (result?.error) {
        setState((s) => ({ ...s, error: result.error }));
        toast.error(result.error);
      }
    });
  }

  if (state.sent) {
    return (
      <div className="mx-auto w-full max-w-[440px] rounded-md border border-border bg-surface p-6 shadow-[var(--shadow)]">
        <span className="grid size-10 place-items-center rounded-sm bg-[color-mix(in_srgb,var(--brand)_12%,var(--mix))] text-brand-text">
          <Mail className="size-5" />
        </span>
        <h1 className="t-h3 mt-4">Enter the code we emailed you</h1>
        <p className="t-muted mt-2">
          Sent to <b className="text-ink">{state.email}</b>. It expires in ten
          minutes and can be used once.
        </p>

        <form action={onVerify} className="mt-6">
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
            onClick={() => router.refresh()}
            className="min-h-[var(--row-h)] text-base text-brand-text hover:underline"
          >
            Resend code
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[560px]">
      <h1 className="t-h3">
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

        {state.error && (
          <p role="alert" className="text-base text-danger-ink">
            {state.error}
          </p>
        )}

        <p className="t-muted flex items-center justify-center gap-2 text-center">
          <Lock className="size-4 shrink-0" />
          Your documents are encrypted at rest and in transit.
        </p>

        {audience === "traveller" && (
          <p className="t-muted text-center">
            {mode === "sign-up" ? (
              <>
                Already have a Toplance account?{" "}
                <Link href="/sign-in" className="font-semibold text-brand-text hover:underline">
                  Sign in
                </Link>
              </>
            ) : (
              <>
                New to Toplance?{" "}
                <Link href="/sign-up" className="font-semibold text-brand-text hover:underline">
                  Create an account
                </Link>
              </>
            )}
          </p>
        )}
      </form>
    </div>
  );
}
