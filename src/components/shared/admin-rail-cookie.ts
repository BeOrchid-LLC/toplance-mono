/**
 * The cookie the rail's collapsed state is stored in.
 *
 * Its own plain module, and deliberately not an export of
 * `admin-rail.tsx`. That file is `"use client"`, and every export of a
 * client module becomes a *client reference* when a server component
 * imports it — so `cookies().get(RAIL_COOKIE)` on the server was not
 * looking up "admin_rail", it was looking up a stub object, finding
 * nothing, and rendering the rail expanded on every navigation while the
 * browser held a perfectly good cookie saying otherwise.
 *
 * A shared constant read on both sides of the boundary has to live
 * outside it.
 */
export const RAIL_COOKIE = "admin_rail";
