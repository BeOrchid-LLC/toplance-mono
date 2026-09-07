/**
 * Fills `{token}` placeholders in a translated string.
 *
 * Dictionary entries carry tokens rather than being assembled from
 * template literals because the value has to survive being chosen by
 * locale first: "{used} of {seats} seats in use" puts its numbers in a
 * different order in Arabic than in English, and a template literal in
 * the component would fix the English order for every language.
 *
 * Lived in `src/app/agency/page.tsx` (and, separately, in
 * `invite-dialog.tsx`) until the console became three pages that each
 * needed it.
 */
export function fill(
  template: string,
  vars: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ""));
}
