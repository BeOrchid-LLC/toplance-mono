"use client";

import * as React from "react";
import { OTPInput, OTPInputContext } from "input-otp";

import { cn } from "@/lib/utils";

function InputOTP({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<typeof OTPInput> & { containerClassName?: string }) {
  return (
    <OTPInput
      data-slot="input-otp"
      containerClassName={cn("flex items-center gap-2", containerClassName)}
      className={cn("disabled:cursor-not-allowed", className)}
      {...props}
    />
  );
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="input-otp-group" className={cn("flex gap-2", className)} {...props} />
  );
}

function InputOTPSlot({
  index,
  className,
  ...props
}: React.ComponentProps<"div"> & { index: number }) {
  const inputOTPContext = React.useContext(OTPInputContext);
  const { char, hasFakeCaret, isActive } = inputOTPContext?.slots[index] ?? {};

  return (
    <div
      data-slot="input-otp-slot"
      data-active={isActive}
      className={cn(
        "relative grid h-[var(--control-h)] w-12 place-items-center rounded-md border border-border-strong bg-surface text-xl font-semibold text-ink transition-[border-color,box-shadow] duration-[var(--dur-tap)]",
        /* A permitted deviation, of the second kind named on
           `:focus-visible` in globals.css: the element that holds focus is
           `input-otp`'s single collapsed <input>, and the slot a person
           actually looks at is this <div>, which never takes focus at all.
           So the ring is drawn here, off the active slot's data attribute
           — same token, same 2px, same 2px offset as everywhere else. */
        "data-[active=true]:border-ring data-[active=true]:outline-2 data-[active=true]:outline-offset-2 data-[active=true]:outline-ring",
        className
      )}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-5 w-px animate-caret-blink bg-ink duration-1000" />
        </div>
      )}
    </div>
  );
}

export { InputOTP, InputOTPGroup, InputOTPSlot };
