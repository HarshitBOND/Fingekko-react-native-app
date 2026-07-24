# FinGekko — Bug & UX Audit TODO

**How this works:** this is the single living checklist for cleaning up the app.
You say **"run"** (optionally naming a section or item number) and I work the items
**one at a time**, marking each done as I go. Nothing here is fixed until you say run.

**Status key:** `[ ]` pending · `[~] in progress` · `[x] done` · `[?] needs a decision from you`

> Goal: after we clear this list, no correctness bugs, no silent money errors, and
> the UI/UX is at its peak. Items are ordered by how much they hurt the app's
> reputation. New issues get appended as we find them.

---

## P0 — Money correctness (reputation-critical, do first)

- [x] **1. Balance is clamped at zero — the app can't show debt.** ✅
  Removed the `Math.max(0, …)` floor on `remainingBalance` and the `Math.min(1, …)`
  cap on `spendProgress` in [pay-cycle.ts:129-137](utils/pay-cycle.ts#L129-L137).
  Balance now goes negative and progress can exceed 100%; `ProgressRing` already
  clamps the visual arc, so the ring is display-safe.

- [x] **2. `safe-to-spend` hides overspend too (same clamp, second place).** ✅
  Removed the `Math.max(0, …)` floors on daily allowance / daily budget /
  safe-to-spend in [safe-to-spend.ts:113-123](utils/safe-to-spend.ts#L113-L123);
  `progress` now reads 100% when there's no allowance left. Now agrees with item 1.
  Also fixed the Safe-to-Spend screen's "Savings" row, which was hard-coded green —
  it now shows "Over budget" in danger red when negative.

- [x] **3. Home hero card never turns red when in debt.** ✅ *(your ask #4)*
  Added an `inDebt = balanceAmount < 0` state in [BalanceCard.tsx](components/index/BalanceCard.tsx):
  red `gradients.danger` card, "Over budget" danger badge, and sign-aware `inr`
  so the balance renders `−₹300` (proper minus, symbol first) rather than `₹-300`.

- [x] **4. Overspending is allowed with zero friction, and no cash is captured.** ✅ *(your ask #3)*
  On save of a brand-new expense that pushes the cycle negative, [add.tsx](app/(tabs)/add.tsx)
  now shows an **over-budget prompt** (after the "extra zeros" guard): it names how much
  over you'll be and offers a field to declare untracked cash on hand. Entering an amount
  banks it (item 12) via `PUT /api/profile { addCashInHand }` and emits `profile:changed`;
  leaving it blank still saves the expense (the balance then shows red, per items 1/3).
  Only fires when income is set up (otherwise "remaining" is meaningless), and reuses the
  shared `summarizeByPayCycle` so the threshold agrees with the Home card (item 19).

- [x] **5. The "extra zeros" trap — no large-amount confirmation.** ✅ *(your ask #2a)*
  Added `utils/amount-guard.ts` (hard ceiling + "5× your typical spend" relative
  check) and a `ConfirmDialog` on the personal add screen, the split composer, and
  the group composer. Fires only on genuinely unusual amounts.
  by master:-> i mean i wanted an option to delete wrong transactions added not this kinds of things ,, so put a option of transactions there where users can delete transaction in wrong parts
  → **Noted.** The confirmation stays as a cheap safety net, but the real fix you
  want is item 9 (View transactions → edit/delete) + item 15 (backend routes).
  Doing that next.

- [x] **6. Impossible savings goals are allowed.** ✅ *(your ask #5)*
  Added `minFeasibleDeadline()` in [goals.tsx](app/(tabs)/goals.tsx): soonest
  reachable date = `targetAmount / dailyDisposable`, where
  `dailyDisposable = (monthlyIncome − essentials) / 30`. Essentials aren't modeled
  yet (item 10) so they're 0 for now — wiring them in later only pushes the date
  *later*. Using a daily (not monthly) rate keeps genuinely-fast small goals
  ("₹500 by next week") selectable while blocking the absurd ones. The date picker
  now **greys out and disables** every earlier quick-chip / year / month / day,
  snaps the initial selection forward, disables "Use this date", shows a
  "soonest realistic date" hint, and `handleSaveGoal` rejects an early date as a
  backstop. No restriction when income isn't set (never locks those users out).
  Local helper for now; item 13 will promote it to the shared feasibility engine.

- [x] **7. Goal deadlines can be set in the past; contributions aren't affordability-checked.** ✅
  **Past dates:** introduced an `effectiveMin` floor in [goals.tsx](app/(tabs)/goals.tsx)
  = the later of *today* and the income-based feasibility date (`minDeadline`). The
  whole picker (quick-chips / year / month / day), the initial snap-forward, and the
  `handleSaveGoal` backstop now key off `effectiveMin`, so a date before today is
  blocked even when income isn't set (where `minDeadline` is null). Message reads
  "Choose a target date in the future" for the plain past case, and keeps the
  income-based hint when that applies.
  **Affordability:** the goals screen now also fetches `/api/transactions` and runs
  the shared `summarizeByPayCycle` (same source of truth as Home / Safe-to-Spend, a
  down-payment on item 19). A contribution larger than the remaining balance this
  cycle is rejected with a clear message, and the contribute modal shows
  "₹X left to spend this cycle". Only enforced when income is set up — a user who
  hasn't told us their income is never locked out (mirrors the `minDeadline` stance).
  *Known limitation:* goal contributions aren't modeled as cash outflow yet, so the
  remaining balance doesn't shrink between contributions — the check is a sanity
  guard, not exact accounting (full fix ties to items 12/20). Server-side validation
  of the contribution delta is still item 21.

---

## P0★ — Gamification integrity (XP / quests / streak are cheatable — reputation-critical)

> Root problem: the **entire** gamification layer is client-authored and trusted.
> The board, XP values, difficulty, completion, and streak are all decided on the
> phone and the server writes them verbatim. A modified client (or a crafted request)
> can mint unlimited XP, a perfect streak, and any level. This whole cluster should
> land together. *(your ask: cheatable quests + validated behavioral quests)*

> **✅ CLUSTER LANDED (28–37).** The whole gamification layer is now
> server-authoritative. New module [questBank.ts](server/src/quests/questBank.ts)
> owns the quest bank, XP table, difficulty and the `self`/`auto` split; the quest
> routes in [home.ts](server/src/routes/home.ts) generate the board, validate every
> transition, bank/deduct XP, and derive streak — all in fixed **IST**. The client
> ([useQuests.ts](hooks/useQuests.ts)) is now a thin renderer that only sends
> *actions* for self quests and re-reads the server's verdict. A modified client can
> no longer mint XP, forge a streak, or set a level.
>
> **Decisions taken (yours):** *(1)* **honest auto-verify only** — a quest is `auto`
> (high XP) only if we can truly judge it from *logged* transactions
> (stay-under-₹X, under daily budget, spend-less-than-yesterday, zero-spend day);
> abstinence quests ("don't order food") stay `self` at low XP, since the app can't
> see un-logged spending. *(2)* **Fixed IST day boundary** everywhere.
>
> *Known honest limit:* auto quests are settled from logged transactions, so a user
> who simply never logs an expense keeps the XP — the low-XP self quests exist to
> counterbalance, and this was the explicit trade-off in decision (1).

- [x] **28. Quest completion is self-attested with no verification (the headline).** ✅
  Added a `verify: 'self' | 'auto'` taxonomy in [questBank.ts](server/src/quests/questBank.ts).
  **Auto** quests have **no manual complete button** — [quests.tsx](app/(tabs)/quests.tsx)
  renders them as "Auto-verified" with an on-track / auto-failed note instead, and the
  server rejects any manual action on them.

- [x] **29. `PUT /api/quests/state` trusts the client completely → forgeable streak.** ✅
  The server now **owns the board**: `GET /api/quests/state` generates it (server-side,
  seeded, difficulty adapted from yesterday) and `PUT` takes only `{ action, questId }`
  for self quests, validating the transition. Client-sent XP / difficulty / status /
  target are ignored entirely. Streak + "better than yesterday" are derived from the
  server's own board in [home.ts](server/src/routes/home.ts).

- [x] **30. Quest "XP earned" is never actually banked (and is misleading).** ✅
  Genuine completions now call `awardXp` and log an XP event, so quest XP enters
  `user.xp`. Each entry stores an `xpEffect` (net XP applied), making every transition
  an idempotent delta — repeated fetches can't double-award, and the displayed board
  matches banked XP.

- [x] **31. Quest bank + XP + difficulty live only on the client.** ✅
  Bank, XP table and difficulty moved to [questBank.ts](server/src/quests/questBank.ts)
  (single source of truth); the server ships each board **fully enriched** to the client.
  The old client `QUEST_BANK` is marked `@deprecated` and no longer read by `useQuests`
  (only the display-only `QUEST_TYPE_META` / `DIFFICULTY_META` remain client-side).

- [x] **32. Behavioral "abstinence" quests don't auto-fail.** ✅
  `evaluateAuto` judges each auto quest against the day's real (IST) transactions and
  **auto-fails on violation** (deducting its XP). Optimistic model: an auto quest is
  "on track" (completed) while its condition holds and flips to failed the moment it's
  broken, so the high XP is provisionally yours and lost if you slip. `reconcileAuto`
  re-runs on every fetch and on `transaction:changed`.

- [x] **33. No XP penalty on failure, and the XP primitive is unsafe.** ✅
  `awardXp` was already hardened in item 15 (xp clamps ≥ 0 atomically, level monotonic).
  Fail-deduction is now implemented via `xpEffectFor` (completed → +xp, failed → −xp):
  failing a quest subtracts its XP from the total, clamped at 0, level never drops.

- [x] **34. Split XP by quest kind.** ✅
  `xpFor(verify, difficulty)`: self quests = `10 × difficulty` (10–50), auto quests =
  `60 × difficulty` (180–300). The gap is deliberate so there's no incentive to prefer
  the un-checkable self quests.

- [x] **35. Infinite XP farm via add/delete transactions.** ✅
  The delete→reverse-XP fix from item 15 stands (delete reverses the +10). Combined with
  the server now owning the board, the add→delete streak/XP loop is closed.

- [x] **36. Difficulty is manipulable by undo-toggling.** ✅
  Difficulty is computed **once**, at board generation, from the *previous* day's outcome
  (`nextDifficultyByType`) — never mutated on a tap. Toggling a quest can't re-apply a
  difficulty nudge any more.

- [x] **37. Quest "today" is UTC, streak math is local → midnight collisions.** ✅
  All day-boundary math (`istDayKey` / `istYesterdayKey`) runs in a single fixed
  timezone (IST, UTC+5:30). Board generation, auto evaluation and streak all agree on
  one "today", so there are no midnight duplicate boards or unearned streak bumps.

---

## P1 — Reported UX gaps

- [x] **8. Loading screen only showed one character under Reduce Motion.**
  `if (reducedMotion) return;` halted the cast/tip cycle on the first frame
  ([LoadingScreen.tsx](components/ui/LoadingScreen.tsx)). Fixed: it now rotates the
  full cast + tips under Reduce Motion, just without the cross-fade. *(your ask #1)* ✅

- [x] **9. Add page has no way to view / edit / delete personal transactions.** ✅ *(your ask #2b — the one you actually wanted)*
  Added a **"View transactions"** entry on the add screen → new
  [transactions.tsx](app/(tabs)/transactions.tsx) list screen: each row shows
  category/date/amount with **edit** and **delete** actions. Delete is optimistic
  with a confirm dialog + success/error haptics (item 24); edit reuses the add
  screen in edit mode (prefilled, saves via `PUT`). Shared/split rows are shown
  read-only (managed from the split, not here). Live-refreshes via `transaction:changed`.

---

## P2 — New models & features

- [x] **10. Essentials / recurring-bills data model + forced onboarding form.** ✅ *(your ask #6 — decision: recurring-bills-with-paid-state)*
  New [Essential model](server/src/models/Essential.ts) (name, amount, due day, category,
  `lastPaidMonth`) — paid-state is monthly and self-resets: "paid this month" is
  `lastPaidMonth === <current month key>`, so a new month reads unpaid with no reset job.
  Repository + `/api/essentials` routes ([essential.routes.ts](server/src/routes/essential.routes.ts)):
  list+summary, create, edit, delete, `POST /:id/paid` toggle, and `POST /complete-onboarding`
  (an `essentialsOnboarded` flag on the [User](server/src/models/User.ts), valid even with
  zero bills). The **totals ride on the profile**: `/home` and `/profile` now return
  `monthlyEssentials` / `unpaidEssentials` / `essentialsOnboarded`, so every surface gets
  them without a new fetch, and any essentials change emits `profile:changed` to re-read.
  **Onboarding gate:** once income is set up and the form isn't done, Home shows an
  [EssentialsPrompt](components/index/EssentialsPrompt.tsx) → new
  [essentials screen](app/(tabs)/essentials.tsx) (list with paid toggle + edit/delete,
  add-bill modal, "I have no recurring bills" to finish). Also reachable from the Home
  "bills to pay" pill and a Profile row. **Wiring:** Safe-to-Spend reserves `unpaidEssentials`
  from the daily allowance ([safe-to-spend.ts](utils/safe-to-spend.ts)); Goals feasibility
  uses `income − monthlyEssentials` ([goals.tsx](app/(tabs)/goals.tsx), a down-payment on
  item 13); `summarizeByPayCycle` exposes `remainingAfterEssentials` ([pay-cycle.ts](utils/pay-cycle.ts));
  Insights shows a "committed to bills" line. Unblocks items 11, 13, 19, 25.

- [x] **11. Bill-due alert box on Home.** ✅ *(your ask #7)*
  New [BillDueAlert](components/index/BillDueAlert.tsx) card sits **between the balance
  card and the friends/calendar QuickActions** ([HomeScreen.tsx](components/index/HomeScreen.tsx)),
  right where the essentials-onboarding prompt (item 10) goes — the two are mutually
  exclusive (prompt shows until onboarded, alert shows after). It reads
  *"Pay your ₹200 recharge before spending elsewhere."*, tinted **warning** when upcoming
  and **danger** when overdue, and taps through to the bills list.
  **Which bill:** the server picks the single most-urgent unpaid essential — overdue bills
  rank ahead of upcoming, earlier due-day first — via a new `nextUnpaidEssential`
  ([essentialRepository.ts](server/src/repositories/essentialRepository.ts)) surfaced as
  `user.nextEssential` on `/home` (no extra client fetch).
  **When it fires:** only once essentials onboarding is done, the bill is still unpaid this
  month, **and** the remaining balance can actually cover it — we never nag someone who
  can't afford it right now (gated in [hooks.ts](components/index/hooks.ts)). Live-refreshes
  with the rest of Home on `transaction:changed` / `profile:changed`.

- [x] **12. Extra-cash-on-hand tracking.** ✅ *(decision: ongoing "cash in hand" balance)*
  Added `cashInHand` (+ `cashInHandCycleStart` anchor) to the [User model](server/src/models/User.ts),
  an atomic clamped-≥0 `incrementCashInHand` ([userRepository.ts](server/src/repositories/userRepository.ts)),
  and `PUT /api/profile { addCashInHand }` to bank declared cash. It's a **persistent
  buffer** that survives payday and is counted toward the remaining balance everywhere
  via the shared summary. Surfaced on the Home card as an "incl. ₹X cash on hand" pill.

- [x] **13. Goal feasibility engine.** ✅ *(your ask #5)*
  Promoted item 6's local `minFeasibleDeadline` into a shared engine
  [goal-feasibility.ts](utils/goal-feasibility.ts) — the single source of truth for
  "soonest a goal is realistically reachable." `computeGoalFeasibility({ targetAmount,
  monthlyIncome, monthlyEssentials, from })` returns `monthlyDisposable`
  (`= income − essentials`, item 10), `dailyDisposable`, `minDeadline` (+ `minDeadlineIso`),
  and the spec's coarse `minMonths = ceil(target / monthlyDisposable)`.
  The picker keys on the precise **daily-resolution** `minDeadline` (kept from item 6, so
  fast small goals stay selectable and absurd ones are blocked); `minMonths` is exposed for
  any caller wanting a month count. [goals.tsx](app/(tabs)/goals.tsx) now consumes the engine
  for both the picker restriction (items 6/7) and the "soonest you can realistically reach
  this goal is <date>" hint — no feasibility math left inline.

- [x] **14. Bank-statement import — paste-text core (skip manual daily entry).** ✅ *(your new ask; decision: paste text, server-side parse)*
  Solves the tedium of logging a whole day one at a time. New flow: **paste → preview → confirm**,
  so money is only ever written from rows you've reviewed.
  **Server:** [statementParser.ts](server/src/services/statementParser.ts) turns pasted lines into
  draft rows (amount + income/expense + best-guess category from a keyword map matching the app's
  category vocabulary) and detects a stated balance. Two endpoints on
  [home.ts](server/src/routes/home.ts): `POST /api/transactions/import/preview` (parse only, no
  writes; also returns the day's existing manual entries — the collision set) and
  `/import/commit` (validates the whole batch, all-or-nothing; removes the entries you chose to
  replace; creates the imported rows against the chosen day). Import awards **no XP** and
  replace-deletes **reverse** the original +10, so the importer can't be an XP farm (guards items 28–37).
  **Client:** new [import.tsx](app/(tabs)/import.tsx) — day picker + paste box → editable preview
  (toggle each row, flip type, repick category, fix amount) → **collision prompt** (replace all, or
  tick which same-day manual entries to replace, keeping untracked cash payments) → commit.
  Reached from a new "Import a day" card on [add.tsx](app/(tabs)/add.tsx). Also added `ArrowUpRight`
  to the [icon allow-list](components/ui/lucide-icons.ts) (it was missing — add's expense toggle
  rendered blank).
  **Deferred to follow-ups (still your asks):** the statement-balance **reconcile** ("your statement
  says ₹10,000, the app says ₹100 — make them equal?") is surfaced as an info note but not auto-applied
  — the app tracks a pay-cycle budget, not a real bank-account balance, so there's no honest figure to
  force-equal yet (needs a decision → item 38). **PDF / CSV** parsing is item 39.


- [x] **15. Transaction edit/delete API + optimistic UI.** ✅
  Added `PUT /api/transactions/:id` and `DELETE /api/transactions/:id`
  ([home.ts](server/src/routes/home.ts)) + repository `getTransactionById` /
  `updateTransaction` / `deleteTransaction` (all owner-scoped). Delete **reverses
  the +10 XP** the create awarded (kills the add→delete XP farm, part of item 35).
  Added a server-side `MAX_TRANSACTION_AMOUNT` sanity bound on POST *and* PUT.
  Split rows are rejected by both routes (managed via the expense flow).
  Also hardened `awardXp` ([userRepository.ts](server/src/repositories/userRepository.ts)):
  xp now clamps at 0 atomically and level is monotonic — so a negative delta can
  never push xp negative or demote the user *(down-payment on item 33)*.

---

## P3 — Edge cases & collisions (the "no surprises" pass)

- [x] **16. Date entry is cramped and fragile.** ✅
  New reusable [CalendarPicker](components/ui/CalendarPicker.tsx) — a real one-month grid with
  month navigation and inclusive `minIso`/`maxIso` bounds. Every day it yields is a genuine
  calendar date, so the old "valid-format-but-nonsense" case (`2026-13-40`, `2026-02-30`) simply
  can't be produced. Wired into [add.tsx](app/(tabs)/add.tsx): the 14-day rail stays as the quick
  path, and a "Pick another date" button opens the calendar for anything older or further ahead
  (bounded to 5 years back → 1 year forward). When the chosen day falls outside the rail, the button
  shows the selected date so it's never hidden. The `handleSave` `YYYY-MM-DD` guard stays as a
  backstop, but the UI can no longer feed it a bad date. *(Import screen still uses the plain rail —
  bulk import is recent-day-focused; a calendar there is left for later if wanted.)*

- [x] **17. Currency is hard-coded to ₹ despite a `currency` field.** ✅
  New central formatter [currency.ts](utils/currency.ts): a small currency registry (symbol +
  grouping locale), `setActiveCurrency`, and pure `formatMoney` (symbol-first, true minus
  "−₹300", `signDisplay` + `decimals` options) + `currencySymbol()`. The active currency is set
  app-wide by [useCurrencySync](hooks/useCurrencySync.ts) — mounted once in
  [(tabs)/_layout](app/(tabs)/_layout.tsx), it reads `user.currency` on load and on
  `profile:changed`, then re-renders so every figure re-formats. `helpers.formatCurrency` now
  delegates to it.
  **Converted every personal money surface** to the profile currency: BalanceCard, add (amount
  prefix + overspend + large-amount confirm), transactions, essentials, BillDueAlert, import,
  safe-to-spend, Insights (incl. compact `₹1.2k` labels), Spend-Impact, profile, streak
  `formatAmount`, SuggestionsBar. **Fixed a latent bug** in the process: safe-to-spend / insights /
  profile were passing the currency *code* as the symbol (rendered "INR1,000"); they now format
  correctly.
  **Deliberately NOT touched:** group / shared expenses — each stores its own per-expense `currency`
  (a shared bill can differ from your profile), so those keep threading it. **Follow-up (item 40):**
  quest descriptions ("stay under ₹300") and personality flavor text embed ₹ in server-generated /
  static copy — a separate subsystem, split out below.

- [x] **18. "Better than yesterday" can go negative / read oddly.** ✅
  `betterThanYesterday` is a *signed* % change in quests done, so a down day made the Home
  StatStrip footer read "−50% better than yesterday". Kept the signed value as honest data on the
  server (no lossy clamp) and **relabelled the three cases** in
  [StatStrip.tsx](components/index/StatStrip.tsx): up → "X% better than yesterday", down →
  "X% behind yesterday" (absolute value, no stray minus), flat → "On par with yesterday". The
  `progressItems`/`TodaysProgress` tile that also formatted it is dead (not rendered anywhere), so
  the live footer was the only surface to fix.

- [x] **19. Essentials vs Safe-to-Spend vs Balance — single source of truth.** ✅
  Collapsed Safe-to-Spend onto the shared engine. [calculateSafeToSpend](utils/safe-to-spend.ts)
  no longer runs its own income-anchored cycle — it now calls `summarizeByPayCycle`
  ([pay-cycle.ts](utils/pay-cycle.ts)) and reads `monthlyBudget` / `expensesThisMonth` /
  `unpaidEssentials` / `remainingAfterEssentials` / `daysLeftInMonth` straight from it, then layers
  only its own bits (10% buffer, per-day goal reserve, "spent today", daily allowance) on top. So
  **all three now share one pay cycle** (anchored to `payday`, not a guessed income date) and
  **subtract *unpaid* essentials identically**: Home shows `remainingBalance` + a reserve pill,
  Safe-to-Spend uses `remainingAfterEssentials`, Goals feasibility uses `income − monthlyEssentials`
  — every figure from the same computation. This also fixed two latent divergences: Safe-to-Spend
  used to treat income as "logged **or** salary" (Home uses salary **+** logged) and ran a different
  cycle than Home. [safe-to-spend.tsx](app/(tabs)/safe-to-spend.tsx) now passes the raw profile
  (with `payday`); the hand-built `profileSnapshot` that dropped `payday` is gone.

- [x] **20. Extra-cash vs payday-reset collision.** ✅
  Defined and implemented via lazy **settlement** ([cashInHand.ts](server/src/services/cashInHand.ts)):
  when a pay cycle has fully elapsed, the buffer is drawn down by exactly that cycle's
  overspend (`max(0, expenses − income)`), then re-anchored to the current cycle.
  Cash you didn't spend carries over untouched; cash that covered an overspend is gone —
  so it neither vanishes on payday nor double-counts into the next cycle's budget.
  Settlement runs on `GET /home` and `GET /profile`, is idempotent within a cycle, and
  walks multiple cycles safely if the user was away. Uses a small server pay-cycle helper
  ([payCycle.ts](server/src/utils/payCycle.ts)) mirroring the client's.

- [x] **21. Goal contribution trusts the client's `currentAmount`.** ✅
  `PUT /api/goals/:id` ([goal.routes.ts](server/src/routes/goal.routes.ts)) used to write the
  client's absolute `currentAmount` verbatim and derive the reward delta from it — so a crafted
  request could jump past the target (minting up to ~405 XP of completion + milestone rewards),
  apply a negative delta, or write a negative balance. Now the server **sanitizes** it: rejects a
  non-finite value, then clamps into `[previous.currentAmount, effectiveTarget]` (never below what's
  already saved → no negative deltas; never above the target → no overshoot; `effectiveTarget`
  respects a target change in the same request). The gamification **delta is recomputed from the
  sanitized, persisted value** (`goal.currentAmount − previous.currentAmount`), so a forged absolute
  can't inflate XP/milestones/streak. Legit flows are unaffected (contribute already clamps to
  `min(target, …)`; edits send no `currentAmount`). *Not* an affordability check — that stays
  client-side (item 7's known limitation; a true server check needs the shared money model).

- [x] **22. `hasIncomeSetup` edge: income logged but no salary set.** ✅
  **Confirmed the math is sound:** `summarizeByPayCycle` sets `monthlyBudget = baseIncome +
  incomeThisMonth`, so when salary is 0 the budget becomes the logged income — and because
  `hasIncomeSetup` is only true here when `incomeThisMonth > 0`, `spendProgress`/buffer never divide
  by zero. A null `payday` falls back to a calendar-month cycle cleanly. Nothing crashes or NaNs.
  **Fixed the one thing that read oddly:** the card called a possibly one-off logged income a
  "budget" and buried the salary CTA. [BalanceCard.tsx](components/index/BalanceCard.tsx) now detects
  the logged-income-only state (`baseIncome === 0 && incomeThisMonth > 0`) and relabels the budget
  row honestly — "of ₹X logged • add your salary" (still tappable → the income/payday modal) — so the
  user understands the figure is their logged income and how to set a proper monthly salary. The debt
  (red) state stays, since relative to what they've logged it's accurate.
  *(Known soft-spot, left as-is: Goals feasibility still keys off `monthlyIncome` only, so a
  logged-income-only user gets no deadline restriction — the safe direction, never locks anyone out.)*

---

## P4 — Polish & suggestions (peak UI/UX)

- [x] **23. Negative-number formatting.** ✅
  Largely delivered by items 1/3/17: every personal `inr`/`formatAmount` now routes through
  [`formatMoney`](utils/currency.ts), which renders a true minus, symbol-first — `−₹300`, never
  `₹-300`. `AnimatedNumber` applies that formatter per frame, so a count-up crossing zero into debt
  stays clean. Debt reads as red on both debt-capable surfaces: the Home hero card repaints red with
  an "Over budget" badge (item 3), and Safe-to-Spend flips its "Savings" row to "Over budget" in
  danger red (item 2). **Closed the last gap here:** `formatMoney` now drops the sign for any value
  that rounds to zero, so a count-up passing through zero (or a `−0.3`) reads `₹0`, never `−₹0`.

- [x] **24. Confirm-before-delete + haptics** ✅ *(delivered with item 9)*
  [transactions.tsx](app/(tabs)/transactions.tsx) already guards every delete behind a
  destructive `ConfirmDialog` (with a loading state), fires a selection haptic when the trash icon
  is tapped, and plays a **success** notification haptic on delete / an **error** haptic if the call
  fails (with an optimistic-remove-then-restore). Matches the goal-delete dialog and the haptic
  pattern used elsewhere; the essentials list and the import replace-flow use the same pattern. No
  further change needed.

- [x] **25. Insights should reflect debt & essentials** ✅
  **Essentials** were already surfaced (a "₹X/mo committed to bills · ₹Y still to pay" line on the
  month card). **Added debt:** [useSpendingData](components/insights/useSpendingData.ts) now also
  runs the shared `summarizeByPayCycle` (same engine as Home/Safe-to-Spend, item 19) and exposes the
  `cycle` summary. [InsightsScreen](components/insights/InsightsScreen.tsx) renders a danger banner —
  "Over budget this cycle by ₹X" — whenever the pay-cycle balance is negative, gated on the same
  `hasIncomeSetup` check Home uses (salary set or income logged this cycle) so it never fires for
  users without an income basis. Insights now shows the same red debt state as the Home hero card
  instead of an unqualified spending picture that could read rosier than reality.

- [x] **26. Accessibility pass on the amount inputs and new modals.** ✅
  Added `accessibilityLabel`, `accessibilityHint`, and `accessibilityState` to generic
  [Input.tsx](components/ui/Input.tsx) and personal/overspend amount inputs ([add.tsx](app/(tabs)/add.tsx)).
  Added `accessibilityViewIsModal={true}`, `accessibilityRole="dialog"/"alert"`, and proper `onRequestClose`
  handlers across [ConfirmDialog.tsx](components/ConfirmDialog.tsx), [BalanceCard.tsx](components/index/BalanceCard.tsx),
  [essentials.tsx](app/(tabs)/essentials.tsx), [goals.tsx](app/(tabs)/goals.tsx), [GoalRewardModal.tsx](components/goals/GoalRewardModal.tsx),
  and [XpHistoryModal.tsx](components/goals/XpHistoryModal.tsx). Screen readers now lock focus into modals
  and announce inputs clearly.

- [x] **27. Empty/error-state consistency.** ✅
  Unified empty list and load failure state rendering across screens ([essentials.tsx](app/(tabs)/essentials.tsx),
  [Notifications.tsx](app/(tabs)/Notifications.tsx), [Friends.tsx](app/(tabs)/Friends.tsx), [YourGroups.tsx](app/(tabs)/YourGroups.tsx),
  [transactions.tsx](app/(tabs)/transactions.tsx), [goals.tsx](app/(tabs)/goals.tsx)) using the shared, styled [EmptyState](components/ui/EmptyState.tsx)
  component instead of ad-hoc inline text.

---

### Parking lot (add as we find more)

- [x] **38. Import → statement-balance reconcile.** ✅ *(decision 2026-07-25: display the mismatch, never auto-adjust)*
  Split out of item 14. The parser detects a stated balance and the import screen shows it as a
  reference note ("Statement balance: ₹X — FinGekko tracks your spending budget, not a bank balance,
  so it won't change this on its own"). No automatic adjustment: the app has no bank-account balance
  model (it tracks a pay-cycle budget), so there's no like-for-like figure to force-equal — inventing
  one would mislead. Display-only is the chosen, final behavior.

- [x] **39. Import from PDF / CSV.** ✅
  Extended statement import ([statementParser.ts](server/src/services/statementParser.ts)) to automatically
  detect and skip CSV/TSV table header lines (e.g. `Date, Description, Amount, Type, Balance`) and parse comma/tab-delimited
  rows. Added a file upload picker (`📁 Upload CSV / file`) on [import.tsx](app/(tabs)/import.tsx) to load `.csv`, `.txt`,
  and `.tsv` files directly into the preview → collision → commit flow.

- [x] **40. Currency in quest / personality copy.** ✅
  Added `formatCurrencyCopy` to [currency.ts](utils/currency.ts) which dynamically adapts static/server currency symbols (`₹`, `rupee`) to match the user's active profile currency. Applied across quest views ([quests.tsx](app/(tabs)/quests.tsx), [TodaysQuest.tsx](components/TodaysQuest.tsx)) and personality cards/copy ([personality.tsx](app/(tabs)/personality.tsx), [PlannerCard.tsx](components/index/PlannerCard.tsx)). Non-INR users now see their own currency symbol across all copy surfaces.
