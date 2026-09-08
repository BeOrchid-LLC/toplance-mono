import type { Page } from "@playwright/test";

/**
 * The operator consoles' side rail.
 *
 * The client's 2026-09-07 review moved both consoles' destinations out of
 * the top bar and down the side, so a link that used to sit in the
 * `banner` now lives in the rail's own `nav`, outside the header
 * entirely — which is why every one of these locators changed at once
 * rather than one spec drifting.
 *
 * Scoping to the rail is also what keeps a nav row from colliding with a
 * heading of the same name: `/agency/team` renders "Team" twice now,
 * once as the row and once as the page's own title, and an unscoped
 * `getByRole("link")` would have to be lucky rather than right.
 *
 * The name is `ADMIN_CONSOLE.menuTitle`, which `AdminSidebar` passes as
 * the nav's accessible name. The mobile nav carries the same label on a
 * *button*, and is a closed dropdown at this viewport, so its rows are
 * not in the document to be matched.
 */
export function consoleNav(page: Page) {
  return page.getByRole("navigation", { name: "Console menu" });
}
