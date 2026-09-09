# Wayfinding redesign — handoff

Read this before starting any session on the wayfinding redesign. It is the
state of the world, the decisions already settled and why, and the traps that
have already cost time.

**Spec:** `docs/superpowers/specs/2026-09-09-wayfinding-redesign-design.md` —
the contract. Where this document and the spec disagree, the spec is right and
this one needs correcting.

**Why the work is split across sessions:** one plan, one branch, one PR, one
session. The plans are committed rather than held in a conversation precisely so
a fresh session can pick one up cold.

---

## 1. How to start a session

1. Read `AGENTS.md` (platform conventions, the destructive-controls rule, the
   recorded deviations).
2. Read the spec.
3. Read this handoff.
4. Read the one plan you are executing. It is written for someone with no
   context and contains the exact code.
5. `git log --oneline -15` to see what actually landed — this document can go
   stale, git cannot.
6. `npm test` first, before changing anything, so you know what red looks like
   on arrival. Green is 131/131 files, 1856/1856 tests. See the fixture-leak
   trap in §5, and check for a second session before believing any red.

Use `superpowers:subagent-driven-development` or `superpowers:executing-plans`
to work through the plan.

---

## 2. What has landed

Branch `design/wayfinding-redesign`, off `main` (`BeOrchid-LLC/toplance-mono`).
The session context may name `feedback/status-pills-and-admin-copy` as the base
branch — **it is stale**. Verify with `gh repo view` before opening a PR.

| Commit | What |
|---|---|
| `519e65b` | The spec |
| `e98e48f` | Funnel ramp — a step per stage (pre-redesign; gets re-derived, see plan 1d) |
| `3e699da` | The foundation plan |
| `c5fdc60` | The contrast guard rail — `contrast.ts` + `tokens.test.ts` |
| `99a9da0` | The palette repaint |
| `a740b94` | Plate geometry — radii, elevation |
| `1c3d03f` | `--ring` token, widened contrast floors |
| `2ffd8cd` | The three places the token layer could not reach — wordmark, assets, email shell |
| `65a4498` | One focus ring instead of two |
| `5bb83d9` | This handoff |
| `8b9cf78` | The favicon repaint, and Task 6 step 1 |
| `8ac9b1d` | Task 4 — the passport materials out, 216 lines of CSS with them |
| `8323edb` | Task 4 marked landed, with what the plan had wrong |

**Verification status:** the token layer has been through three adversarial
rounds. Rounds one and two each shipped work that passed review and was broken
in the browser; both defects are recorded in §4. A full green suite was
observed after Task 4: 131/131 files, 1856/1856 tests, typecheck clean. Check
`git log` and the suite rather than trusting this line.

---

## 3. The plan map

**There is no plan 1b, 1c, 1d or 1e to write.** An earlier version of this
document said there was, and that cost a session its first several minutes.
The whole foundation is *one* file —
`docs/superpowers/plans/2026-09-09-wayfinding-foundation.md` — and what that
earlier map called 1b–1e are Tasks 4–8 inside it, already written, with the
exact code. Execute the task; do not go looking for a plan that does not exist.

| Foundation task | Was called | State |
|---|---|---|
| Tasks 1–3 — guard rail, repaint, plate geometry | 1a | landed |
| **Task 4** — retire the passport materials | 1b | landed (`8ac9b1d`) |
| **Task 5** — the faces | 1c | open |
| **Task 6** — the primitives | 1d | step 1 landed, 2–9 open |
| **Task 7** — error boundaries, loading, skip link | 1e | open |
| **Task 8** — re-derive the funnel ramp | 1d | open |
| Task 9 — the things no token owns | — | landed |

These four still have to be written, and only after the foundation lands:

| Plan | Scope | State |
|---|---|---|
| **2** Traveller concourse | route diagram, next-step plate, corridor bar, intake, documents, profile | to write |
| **3a / 3b** Agency board | case desk + roster / billing, team, support | to write |
| **4a / 4b** Ops dispatch | dashboard, tenants, KYB / corridors, enquiries, support, staff | to write |
| **5** The sweep | 10 locales × 2 themes × RTL × 390px across 46 routes | to write |

**Order matters more than session count.** Plans 2–5 lay out screens against
primitives that Tasks 5–8 are still moving. Do not start a surface plan before
the foundation is finished, or the surface work gets redone. Plan 5 is the one
partial exception: it asserts invariants — no horizontal overflow at 390px, RTL
mirroring, contrast in both themes — rather than appearances, so its harness can
be built before the surfaces settle. Nothing in `e2e/` sweeps today.

---

## 4. Decisions already settled

These cost real time to establish. Re-deriving them is waste; reversing them
without new evidence re-introduces a defect.

### The palette keeps the existing token identifiers

The spec names the roles `--concourse`, `--plate`, `--route`. The code keeps
`--bg`, `--surface`, `--brand` and changes their *values*. Renaming would be a
mechanical diff across ~130 files for no behavioural gain. Only `--way`,
`--way-ink` and `--ring` are new names.

### `--ring` is a separate token from `--brand`, deliberately

The obvious fix for the dark focus ring is to lift `--brand` to the spec's
`#4C8FE0`. **Do not.** White on that blue is 3.327:1, below the 4.5 floor for
the primary button's label. A fill carrying a label and a boundary against a
ground have different floors and cannot be the same value in dark. This is a
deviation from spec §1 and §7, which both name `--route` for the ring.

### `--way` is a fill, never type

It carries `--way-ink` in both modes. As type it cannot clear 4.5:1 on a plate.
Exactly one thing per screen wears it — the next action. Two means one is wrong.

### The guard rail's rule: the new pair goes in before the old one comes out

Commit `99a9da0` rewrote two failing assertions to passing ones in the same
commit as the palette they guard. That hid a live regression for a full
verification round. If a pair has to move, the stricter pair lands **first**,
and the reason goes in the file.

### A contrast pair is tested against every ground the token lands on

`--ink-3` cleared 4.5:1 on `--surface` by 0.019 and failed on `--surface-2`,
`--surface-inset` and `--bg` — which is every table column head and 17px body
copy on the landing page. Passing on one ground proves nothing.

### The two-brand axis survives

`[data-brand="beorchid"]` is untouched and still teal. BeOrchid's own
`--route`/`--way` pair is deferred until that product needs it, and gets the
same validation run then.

### Some things genuinely cannot read a token

The plan originally claimed "nothing hard-codes a hue". Three counter-examples
were found: a component literal (`wordmark.tsx`), six binary assets
(`favicon.ico` and five SVGs — an `<img>` src gets no CSS custom properties),
and `src/lib/notifications/layout.ts`, because email HTML cannot read custom
properties at all. These are hand-maintained copies. `wordmark.tsx` carries the
list; update it with the palette.

---

## 5. Traps

- **`npm test` red on arrival is usually the fixture leak.** Symptoms:
  `duplicate key ... profiles_pkey`, `invitations_token_unique`, hook timeouts,
  all in Postgres-backed suites, zero assertion failures. Run
  `npm run db:clean-fixtures` and re-run — it should be 131/131 files, 1856
  tests. Two verifiers reported this as a blocker with mutually inconsistent
  counts; both were wrong.
- **Check whether another session is running the suite before you believe any
  red.** Every session on this branch shares one Postgres, so two suites at once
  produce exactly the fixture-leak signature above, and cleaning fixtures does
  not fix it because the other run is still inserting. On 2026-09-09 this
  produced 80 failures, then 98 after a clean, then 7, then zero — same tree,
  four different answers, no code changed. `ps aux | grep vitest` before
  bisecting anything.
- **Never pipe `npm test` into `head` or `tail`.** `head` can SIGPIPE the run
  and leak fixtures; `tail` keeps only the summary, so the failure detail you
  need is gone and the rerun costs two minutes. Redirect to a file and read
  that.
- **Never verify a focus style by reading CSS.** Tailwind v4 emits
  `@layer theme, base, components, utilities`, and layers order by *declaration*,
  not source position — so `outline-none` on a component beats `:focus-visible`
  in `@layer base` wherever it sits in the file. Start the dev server, drive a
  headless Chromium, press Tab, read `getComputedStyle`. Two rounds passed CSS
  review and shipped a ring that painted on nothing.
- **A focus ring on a control inside `overflow-hidden` is clipped.** Measured,
  not reasoned about: `DisclosurePanel`'s summary reported clipped at 2px out
  and not clipped at 2px in. Those call sites turn the ring inward with
  `focus-visible:-outline-offset-2`.
- **Ports 3000 and 3100 are taken** by other projects. Use 3400 — but check
  first: this worktree may already have its own `next dev` on it, in which case
  use that one rather than starting a second. Next refuses the second anyway,
  and says which PID and directory holds the first.
- **Every route on the local dev server redirects to `/sign-in` without a
  session** — `/en` and `/en/travelers` included. The marketing surfaces
  (`site-nav`, the hero, `CorridorBar`) therefore cannot be eyeballed without
  signing in first, which is how Task 4 shipped its one change verified by code
  rather than by eye. Sign in before claiming you looked at a marketing screen.
- **Running from a worktree** needs `node_modules` and `.env.local` cloned from
  the main checkout.
- **The git stash stack is shared across worktrees.** Never bare
  `git stash` / `git stash pop`. Prefer a WIP commit.
- **`npm test` typechecks nothing.** Run `npm run typecheck` separately after
  any merge.
- **There is no component-test infrastructure.** `vitest.config.mts` is
  `environment: "node"`, `include: ["src/**/*.test.ts"]`. Do not add jsdom or
  Testing Library as part of this redesign — the testable surface is the token
  invariants plus Playwright.

---

## 6. Open — not ours to close

Both were flagged before the work started and neither is resolved.

**The type fence is client-locked.** Guideline §2 fences Inter to product
screens and Archivo to marketing, and says in terms: *"This fence is
client-locked. Do not move it."* The wayfinding direction moves it — that is the
central move, since the consoles are mute precisely because the identity face
was fenced out of them. **The client must agree in writing.** Everything else
proceeds without it. Plan 1c swaps the body face and re-cuts the `.d-*` roles
but leaves them fenced to chrome and marketing; moving them onto product screens
is a separate change gated on that agreement. If the client declines, the
fallback is Archivo in chrome only — rail, bar, board heads — which is most of
the value and none of the disagreement.

**`LIVE_CORRIDORS` is a hardcoded array.** `src/lib/domain/corridors.ts:292`.
Approving a corridor in `/ops` does not change the marketing site, so a reviewer
does work the product never reflects. This is a product bug, out of scope for
the redesign, and it needs its own plan. It is recorded here so it is not lost.

---

## 7. What "done" does not mean

The original request was to make the product production-ready. The redesign
cannot deliver that on its own. `AGENTS.md` records deviations that are
explicitly platform-team work and must not be migrated unilaterally — the
`toplance.*` schema move, `core.users`, the `organisations` spelling,
`audit_log` singular, the repo name. Those stay open regardless of how much of
this redesign lands.
