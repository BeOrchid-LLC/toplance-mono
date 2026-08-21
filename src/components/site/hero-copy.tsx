"use client";

import Link from "next/link";
import { ArrowRight, Briefcase, CheckCircle2, Globe, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useT } from "@/components/locale-provider";
import { HERO } from "@/lib/i18n/hero";

const TRUST_ICONS = [CheckCircle2, Lock, Globe];

export function HeroCopy() {
  const t = useT();

  return (
    <div>
      <p className="kicker soft">{t(HERO.kicker)}</p>
      <h1 className="t-h1 mt-3">{t(HERO.title)}</h1>
      <p className="t-body-lg soft mt-4 max-w-[56ch]">{t(HERO.body)}</p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button
          asChild
          className="!bg-white !text-[color:var(--brand)] hover:!brightness-95"
        >
          <Link href="/sign-up">
            {t(HERO.ctaPrimary)} <ArrowRight />
          </Link>
        </Button>
        <Button
          asChild
          variant="secondary"
          className="!border-white/45 !bg-white/15 !text-white hover:!bg-white/25"
        >
          <Link href="#orgs">
            <Briefcase /> {t(HERO.ctaSecondary)}
          </Link>
        </Button>
      </div>

      <ul className="mt-8 flex flex-col gap-3">
        {HERO.trust.map((line, i) => {
          const Icon = TRUST_ICONS[i];
          return (
            <li key={line.en} className="flex items-center gap-2">
              <Icon className="size-5 shrink-0" aria-hidden />
              <span className="t-body soft">{t(line)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
