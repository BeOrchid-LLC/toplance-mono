-- The canonical value a conditional-requirement rule matches, stored
-- beside the traveller's own words rather than instead of them.
--
-- Rows written before this column existed are backfilled by
-- `npm run db:intake-codes`, which runs the real `normaliseAnswer`
-- rather than a copy of the chip tables in SQL: a migration that
-- duplicates application data goes stale the first time a chip is
-- reworded, and a null code is the safe state in the meantime — every
-- rule naming that topic hedges instead of resolving to a confident no.
ALTER TABLE "intake_answers" ADD COLUMN "code" text;
