"use client";

import * as React from "react";
import { CalendarPlus, Fingerprint, MessagesSquare } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { inviteToAttend } from "@/app/[locale]/agency/actions";
import { useT } from "@/components/locale-provider";
import { ATTENDANCE } from "@/lib/i18n/attendance";

/**
 * Ask the traveller to come to an office.
 *
 * The one step in the flow the product cannot perform: biometrics are
 * captured on the destination government's portal and interviews happen
 * at a consulate, neither of which has an API. So this does not book
 * anything — it tells the traveller where to be, by email and on their
 * own dashboard, which is the part we can be responsible for.
 *
 * A dialog rather than four fields standing open in the case rail, on
 * exactly the argument `AskAboutCase` next to it already makes: calling
 * somebody in is a detour from reviewing a case, and the case should
 * still be there behind it. It is also once or twice in a case's life,
 * against a rail whose other tenants are used continuously — and the
 * form was tall enough to push them past the bottom of the screen.
 *
 * Still not a destructive control, and still not behind a dialog for
 * that reason: it adds an appointment and takes nothing away, so there
 * is no confirmation step here and the button commits on the click. The
 * button says what happens — "Send the invitation" — rather than naming
 * the dialog it sits in.
 *
 * The kind is two buttons rather than a select. There are exactly two,
 * they are the first decision, and a two-option dropdown is a click
 * spent hiding one word.
 */
export function InviteAttendance({ applicationId }: { applicationId: string }) {
  const t = useT();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [kind, setKind] = React.useState<"biometrics" | "interview">("biometrics");
  const [when, setWhen] = React.useState("");
  const [place, setPlace] = React.useState("");
  const [note, setNote] = React.useState("");

  function submit() {
    const formData = new FormData();
    formData.set("application_id", applicationId);
    formData.set("kind", kind);
    formData.set("when", when);
    formData.set("place", place);
    formData.set("note", note);

    startTransition(async () => {
      const result = await inviteToAttend(formData);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      // The fields clear because the next invitation on this case is a
      // different appointment, not an edit of this one.
      setWhen("");
      setPlace("");
      setNote("");
      setOpen(false);
      toast.success(t(ATTENDANCE.sent));
    });
  }

  const kinds = [
    { value: "biometrics" as const, label: ATTENDANCE.kindBiometrics, Icon: Fingerprint },
    { value: "interview" as const, label: ATTENDANCE.kindInterview, Icon: MessagesSquare },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="neutral" size="sm">
          <CalendarPlus className="size-4" aria-hidden />
          {t(ATTENDANCE.panelTitle)}
        </Button>
      </DialogTrigger>
      {/* The form runs to four fields, so it is told to scroll rather
          than to run off a short laptop screen with its send button
          below the bottom edge. */}
      <DialogContent className="max-h-[calc(100dvh-4rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t(ATTENDANCE.panelTitle)}</DialogTitle>
          {/* The lead that used to sit above the fields in the rail. It
              says the appointment happens somewhere else, which is the
              one thing somebody has to know before filling this in. */}
          <DialogDescription>{t(ATTENDANCE.panelLead)}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-3">
          {kinds.map(({ value, label, Icon }) => (
            <Button
              key={value}
              type="button"
              variant={kind === value ? "primary" : "neutral"}
              size="sm"
              aria-pressed={kind === value}
              disabled={pending}
              onClick={() => setKind(value)}
            >
              <Icon className="size-4" aria-hidden />
              {t(label)}
            </Button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="t-label" htmlFor="attendance-when">
              {t(ATTENDANCE.whenLabel)}
            </label>
            <Input
              id="attendance-when"
              type="datetime-local"
              className="mt-2"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              disabled={pending}
            />
            <p className="t-muted mt-2">{t(ATTENDANCE.whenHint)}</p>
          </div>
          <div>
            <label className="t-label" htmlFor="attendance-place">
              {t(ATTENDANCE.placeLabel)}
            </label>
            <Input
              id="attendance-place"
              className="mt-2"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              placeholder={t(ATTENDANCE.placePlaceholder)}
              maxLength={300}
              disabled={pending}
            />
          </div>
        </div>

        <div>
          <label className="t-label" htmlFor="attendance-note">
            {t(ATTENDANCE.noteLabel)}
          </label>
          <Textarea
            id="attendance-note"
            className="mt-2"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t(ATTENDANCE.notePlaceholder)}
            rows={2}
            maxLength={1000}
            disabled={pending}
          />
        </div>

        <div>
          {/* Disabled until there is an address, because the address is
              the whole message. A time is optional; a place is not. */}
          <Button type="button" disabled={pending || !place.trim()} onClick={submit}>
            {t(ATTENDANCE.send)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
