# Fingekko

Gamified personal finance app: expense tracking, Splitwise-style group/friend bill splitting, savings goals, and spending insights. Expo Router (React Native) frontend + Express/Mongoose backend, Clerk for auth.

This file is the continuation point if a work session ends mid-task — it records what's done, what's still open, and exactly how to pick the work back up.

## ⚠️ Before you can deploy: two blockers only you can fix

These are credentials/config I can't fabricate. The app **will not authenticate real users or reach a live backend** until both are set:

1. **`CLERK_SECRET_KEY` is missing from `server/.env`.** `server/src/utils/clerkClient.ts` reads it to call the Clerk Backend API (`clerkClient.users.getUser(...)`), which is how `authMiddleware` resolves a verified Clerk token into your Mongo `User` record. Without it, every sign-in falls through to a dead local-JWT fallback path and all authenticated requests 401. Get this key from your Clerk dashboard → API Keys → "Secret keys", add it to `server/.env`, and set it on whatever host runs the backend in production.
2. **`EXPO_PUBLIC_API_URL` still points at a dev machine's local IP** (`utils/api.ts` falls back to `http://10.234.11.110:4000` if the env var isn't set). Before building for TestFlight/Play/production, set `EXPO_PUBLIC_API_URL` to your deployed backend's public HTTPS URL (Render/Railway/Fly, per your setup) in `.env` and in the EAS build profile's env if you build with `eas build`.

(`EXPO_PUBLIC_API_URL_ANDROID` / `_IOS` / `_WEB` in `.env` are unused — only `EXPO_PUBLIC_API_URL` is read anywhere. Safe to ignore or remove.)

## What got fixed this session (2026-07-07)

Went through Splitwise → Home → Insights → Goals in order, audited each with a full frontend+backend pass, then fixed what was actually broken or faked. TypeScript (`tsc --noEmit`) is clean on both `fingekko-app` and `fingekko-app/server`.

### Splitwise (groups, friends, expenses)
- **Settle Up was completely non-functional**: frontend called `POST /:expenseId/settle`, backend only accepted `PATCH` (405/404 in prod). Backend now accepts both. The handler also always marked the *caller's own* participant row as settled instead of the participant named in the request body — fixed to target the correct side of the debt (`server/src/routes/communityExpense.routes.ts`).
- Per-expense `netBalance` now accounts for `settled` state (previously ignored it, so settling never changed what the UI showed).
- **`GET /api/groups` returned a hardcoded `balance: 0`** for every group, and didn't even send the fields the list screen expects (`amountLabel`/`amount`/`amountColor`). Now computes real per-group balances via `computeGroupBalances` (`server/src/routes/group.routes.ts`).
- **Add-friend-from-Create-Group was broken**: used a bare `fetch('/api/friends/request', { body: { userId } })` — wrong payload shape (route expects `{ email }`) and a relative URL that wouldn't resolve on-device. Fixed to use the app's `apiRequest` helper with the right payload (`app/(tabs)/group/AddNewGroup.tsx`). Removed a second, unused, already-correct implementation of the same thing that had been left dead in the same file.
- **Group detail's "Recent expenses" was a hardcoded placeholder** ("connected to the backend, but expenses are not loaded here yet"). Now fetches and lists real expenses for that group, with a working "View all" screen (`app/(tabs)/GroupExpenses.tsx`, previously a `<Text>Group Expenses</Text>` stub with zero logic). Group detail also now refetches on screen focus, so it reflects changes after adding/settling an expense.

### Home
- **Quest completion silently failed to save.** `TodaysQuest.tsx` called the shared `apiRequest` helper using its fetch-style calling convention (`{ method: 'PUT', body: ... }` as the second argument) against an axios-based function that only understands that shape via its object-form overload — the string-form overload it was actually hitting hard-codes `GET`. Tapping "Done"/"Can't" updated local state only; nothing ever reached the backend. Fixed both call sites to use the object-form overload correctly.
- **`User.stats` (streak, quests done, "better than yesterday") never updated after signup** — nothing wrote to it, so every real user was frozen at 0 forever. `PUT /api/quests/state` now recomputes and persists `questsDone`, `dayStreak` (real consecutive-day logic, resets if a day is skipped), a new `bestStreak` (previously "Best streak" in the UI just redundantly showed the current streak), and `betterThanYesterday` (previously always 0).
- **Home screen showed hardcoded numbers even with "demo data" turned off** — balance, monthly spend/budget, streak calendar were all literals, not derived from anything. `useDummyData` now defaults to `false`, and both demo and real modes run through the same `summarizeExpenses` calculation over real fetched transactions (`GET /api/transactions`) when not in demo mode. The "Add expense" control now posts to the real API in real mode instead of only mutating in-memory demo state.
- `StreakCard`'s demo/real branches were inverted (real users saw the fake canned calendar; demo mode computed from data) — now always derives from whichever transactions are active.
- The dev-only "Demo data" card (`DemoDataCard`) is now gated behind `__DEV__` so it won't show to real users in a production build.
- The "Eye" icon on the balance card did nothing before; it now actually toggles hiding the balance.
- **`TodaysQuest` (the actual interactive quest list) had no reachable screen at all** — it turned out `app/(tabs)/goals.tsx` was a byte-for-byte leftover copy of the Home dashboard (see Goals below), and that was the only place `TodaysQuest` was ever rendered. It's now on the real Home screen, under the summary stat tiles, so completing quests is actually reachable and exercises the streak/XP fix above.

### Insights
- Removed the "Use dummy data" toggle from production builds (now `__DEV__`-gated) — it had no gate before and would have shipped to real users.
- The "Top Spending Categories" card was labeled "This Month" but was computed from **all-time** transactions; scoped it to the current calendar month. Also stopped silently blending in fake zero-amount placeholder categories (Shopping/Food/Home) when a user had fewer than 3 real categories — it now just shows however many real categories exist.
- Category icon/color used to be assigned by *row position* (whatever your #1 category was always got the shopping-bag icon), not by category identity. Now keyed by category name with a stable fallback for unrecognized categories.
- "Biggest spends" stat was `min(3, totalExpenseCount)` — not actually measuring anything. Now counts this month's transactions that are notably above this month's own average.
- The weekly-budget fallback (used when a user hasn't set `monthlyIncome`) manufactured a near-constant ~83%-used progress bar (`weeklySpend * 1.2`); now bases it on last month's real total spend instead.
- The chart's y-axis max was pinned to current/last month's totals even when browsing a different historical month via the month picker, clipping the line for months with very different totals. Now scales to whichever series is actually displayed.
- Deleted dead code: `components/insights/Header.tsx`, `HeroCard.tsx`, `utils.ts`, `types.ts` were exported from the barrel but never imported anywhere; `InsightsScreen.tsx` had its own inline reimplementation of the same header/hero markup and a duplicated (twice) cumulative-chart-building function.

### Goals — built from scratch
This was the biggest gap: **`app/(tabs)/goals.tsx` had no goals functionality at all.** It was a leftover, unmodified copy of the pre-refactor Home screen (imported `HomeResponse`, fetched `/api/home`, rendered the streak/XP dashboard) that happened to still work and never got replaced when the "Goals" tab was wired up.
- Backend: the `Goal` Mongoose model and `goalRepository.ts` (list/create/update/delete) already existed, but only list+create were ever exposed over HTTP (inline, oddly, inside `home.ts`), and update/delete had no route at all. Added a proper `server/src/routes/goal.routes.ts` (mirroring the `friends.routes.ts` convention) with full CRUD, mounted at `/api/goals`; removed the old inline routes from `home.ts` to avoid a path collision.
- Frontend: `app/(tabs)/goals.tsx` is now a real Goals screen — list of goals with progress rings, days-left/overdue labeling, "Add funds" (contribute toward a goal), delete, and a "New Goal" form (title, target amount, deadline, emoji picker), all backed by the new API.

### Not touched / known remaining gaps
Left as-is for now — none of these break core functionality, but worth knowing about:
- `components/yourDreamJourney.tsx` and `components/BageSection.tsx` are now unused/orphaned (their only caller was the old fake `goals.tsx`). Both still have hardcoded content (a fixed ₹35,000 goal, static badges) — candidates for a future "personalize with real data" pass, or deletion if not wanted.
- `utils/storage.ts`'s `getGoals`/`saveGoal` (AsyncStorage-based, pre-dates the API) are unused dead code, not wired to the new Goals screen (which correctly uses the backend instead).
- `server/src/routes/transaction.ts` (0 bytes), `server/src/services/expense_service.ts`, `server/src/repositories/expenseRepository.ts`, `server/src/models/Expense.ts`, `server/src/models/GroupSummarySchema.ts` are all orphaned/unused leftovers from an earlier data model, superseded by `CommunityExpense`/`communityExpenseService`. Safe to delete whenever convenient; not currently imported by anything mounted.
- `app/(tabs)/AddExpense.tsx` and `app/(tabs)/GroupExpenses.tsx` are registered as hidden tab routes; `AddExpense.tsx` is a pure re-export of `AddNewExpense.tsx` with no navigation ever targeting it — harmless but unused.
- Insights' "Unlock Smart Saver badge" reward target is a hardcoded ₹3,000 regardless of the user's actual income/currency — cosmetic, not wrong, just not personalized.
- No automated tests exist anywhere in the repo. All verification this session was `tsc --noEmit` (clean on both packages) + manual code reading; UI flows were not exercised in a running simulator/device.

## Environment variables

**Frontend** (`.env`, only `EXPO_PUBLIC_*` vars are baked into the client bundle):
- `EXPO_PUBLIC_API_URL` — backend base URL. **Must be the deployed backend's HTTPS URL before any real build.**
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk publishable key (currently a `pk_test_...` key — swap for a production Clerk instance's key before shipping to real users, if you haven't already split test/prod Clerk instances).

**Backend** (`server/.env`):
- `MONGODB_URI`, `MONGODB_DB_NAME` — Mongo connection.
- `JWT_SECRET` — local JWT fallback signing secret (secondary path; Clerk is primary).
- `CLERK_ISSUER`, `CLERK_FRONTEND_API`, `CLERK_JWK` — used to verify Clerk-issued JWTs.
- `CLERK_SECRET_KEY` — **currently missing, see blocker #1 above.** Needed to resolve a verified token into a full Clerk user profile.
- `SVIX_SECRET` — verifies incoming Clerk webhook signatures (`routes/clerkWebhook.ts`).
- `PORT`, `CORS_ORIGIN` — server port and comma-separated allowed origins.

## Running locally

```bash
# backend
cd server
npm install
npm run dev          # tsx watch, http://localhost:4000

# frontend (separate terminal, from repo root)
npm install
npx expo start
```

Point `EXPO_PUBLIC_API_URL` at wherever the backend is reachable from your device/simulator (a local IP on the same network for a physical device, `http://localhost:4000` for a simulator on the same machine, or your deployed URL).

## Deploying

You said the backend already has a host set up (Render/Railway/Fly-style, auto-deploys on push) — once the two blockers above are resolved there, a normal `git push` to whatever branch it's tracking should redeploy it. This session did not push anything or touch CI/deploy config.

For the app itself, getting to an actual App Store / Play Store listing needs steps only you can do (I can prep code but can't run interactive logins or hold your developer accounts):
1. `npx eas login` (needs an Expo/EAS account).
2. No `eas.json` exists yet in this repo — running `eas build:configure` will scaffold one.
3. `app.json` is missing an iOS `bundleIdentifier` (only `android.package` is set) and an `extra.eas.projectId` — `eas build:configure` / `eas init` fills these in once you're logged in.
4. Apple Developer Program ($99/yr) and Google Play Console ($25 one-time) enrollment, if not already done — Apple's review alone can take 24–48h+, so this is the actual pace-setter for "live in stores," not the code.
5. `eas build --platform all` then `eas submit` once builds are green.

## Project structure

- `app/` — Expo Router screens (`(tabs)/` = main tab screens, `(auth)/` = sign-in/up).
- `components/` — screen-specific component folders (`index/` = Home, `insights/` = Insights) plus shared `ui/` primitives (`Card`, `AppText`, `Button`, `ScreenContainer`, etc. — check `components/ui/index.ts` before building new UI, most needs are already covered).
- `server/src/routes/` — one Express router per domain (`group.routes.ts`, `friends.routes.ts`, `communityExpense.routes.ts`, `goal.routes.ts`, `home.ts` for user/transactions/quests, `notification.routes.ts`).
- `server/src/repositories/` — Mongoose data access, one per model.
- `constants/design.ts` — palette/spacing/typography tokens used throughout the UI layer.
