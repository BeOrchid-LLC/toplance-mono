import { refreshFxRates } from "../src/lib/fx/rates.ts";

/**
 * Fill `fx_rates` once, from the command line.
 *
 * The table is filled by a daily scheduled task hitting
 * `/api/cron/fx-rates`, which is deploy-time config — so on a developer's
 * machine, and on a staging environment nobody has wired a scheduler to,
 * it is simply empty. Every caller treats an empty table as "show no
 * converted figure", which is correct and which looks exactly like the
 * feature not existing. It cost a round of client feedback.
 */
const result = await refreshFxRates();

if (!result) {
  console.error(
    process.env.OPEN_EXCHANGE_RATES_APP_ID
      ? "The rates provider did not answer. Nothing was written."
      : "No OPEN_EXCHANGE_RATES_APP_ID is set, so there is nothing to fetch."
  );
  process.exit(1);
}

console.log(`Wrote ${result.updated} rates against ${result.base}.`);
