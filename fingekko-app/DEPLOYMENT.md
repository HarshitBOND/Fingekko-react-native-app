# 🚀 FinGekko — Play Store Deployment Checklist

Everything that must be done **before** shipping FinGekko to the Google Play Store.
This app is an [Expo](https://docs.expo.dev/versions/v54.0.0/) (SDK 54, New Architecture) app built with `expo-router` and Clerk auth. Builds are produced with **EAS Build**.

Work top-to-bottom. Anything marked **🔴 BLOCKER** will get your submission rejected or make it impossible to update the app later.

---

## 0. Accounts & tooling (one-time)

- [ ] **Google Play Developer account** ($25 one-time) — https://play.google.com/console
- [ ] **Expo account** + EAS CLI: `npm install -g eas-cli && eas login`
- [ ] Node 18+ and the repo installing cleanly: `npm install`

---

## 1. App identity — 🔴 BLOCKERS

These cannot be changed once the app is published.

- [ ] **Change the Android package name.** It is currently the Expo placeholder:
  ```jsonc
  // app.json → expo.android.package
  "package": "com.anonymous.fingekkoapp"   // ❌ must not ship as "com.anonymous.*"
  ```
  Set it to a real reverse-domain you own, e.g. `com.fingekko.app`. **Permanent** — it is the app's identity on Play forever.
- [ ] **Set the app display name** (`expo.name`) to the user-facing name (`FinGekko`, not `fingekko-app`).
- [ ] **Versioning:**
  - `expo.version` — human-facing (`1.0.0`).
  - `expo.android.versionCode` — integer Play uses to order builds. Add it and bump it **every** upload. With EAS you can instead set `"autoIncrement": true` in `eas.json` (recommended).

---

## 2. Create `eas.json` — 🔴 BLOCKER

There is **no `eas.json`** in the repo yet; EAS Build needs it. Run `eas build:configure` (creates one) or add:

```jsonc
{
  "cli": { "version": ">= 12.0.0", "appVersionSource": "remote" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }   // installable APK for testers
    },
    "production": {
      "autoIncrement": true,
      "android": { "buildType": "apk" }   // APK — direct download for website
    }
  },
  "submit": {
    "production": {}
  }
}
```
> Play requires an **Android App Bundle (`.aab`)** for production, not an APK.

---

## 3. Environment variables & secrets — 🔴 BLOCKER

`.env` currently holds **development** values. `EXPO_PUBLIC_*` vars are **inlined into the JS bundle at build time**, so whatever is set when you run `eas build` ships to users.

- [ ] Point the API at **production**, not localhost/ngrok:
  - `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_API_URL_ANDROID` → your deployed HTTPS backend.
- [ ] Use the **production** Clerk key: `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` (starts with `pk_live_…`, not `pk_test_…`).
- [ ] Register these as EAS environment variables / secrets so cloud builds get them:
  ```bash
  eas env:create --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY --value pk_live_xxx --environment production
  eas env:create --name EXPO_PUBLIC_API_URL --value https://api.fingekko.com --environment production
  ```
- [ ] Confirm `.env` is **git-ignored** and no secret is committed.
- [ ] In the **Clerk dashboard**, create a Production instance and add the app's package name / deep-link scheme (`fingekkoapp`) to the allowed redirect origins.

---

## 4. Backend readiness

- [ ] Backend deployed on **HTTPS** (Android blocks cleartext HTTP by default).
- [ ] CORS / auth accepts requests bearing production Clerk JWTs.
- [ ] Production database is separate from dev, seeded/migrated as needed.

---

## 5. Assets & store listing

- [ ] **App icon** `./assets/images/icon.png` — 1024×1024, no transparency for the store icon.
- [ ] **Adaptive icon** foreground/monochrome (already configured in `app.json`) render well on a `#F7F8F6` background.
- [ ] **Splash screen** (`splash-icon.png`) looks right in light **and** dark (dark bg is `#000000`).
- [ ] **Feature graphic** 1024×500 (Play listing).
- [ ] **Screenshots** — at least 2 phone screenshots (min 320px). Capture Home, Add expense, Groups, Insights, Profile.
- [ ] Short description (≤80 chars) + full description.
- [ ] App category, contact email, and a hosted **Privacy Policy URL** (required — the app collects account data, photos, and financial info).

---

## 6. Compliance / Play Data Safety — 🔴 BLOCKER

- [ ] Complete the **Data safety** form. FinGekko collects: account info (Clerk), profile **photos** (`expo-image-picker`), and financial data (expenses/income). Declare each and whether it's shared.
- [ ] Photo permission string is set (`app.json` → expo-image-picker `photosPermission`) ✅ — verify the copy reads well.
- [ ] Complete the **content rating** questionnaire.
- [ ] Add a **Privacy Policy** covering financial + photo data.
- [ ] Confirm no unused sensitive permissions are requested (review the generated `AndroidManifest` after a build).

---

## 7. Signing

- [ ] Use **EAS-managed signing** (recommended): `eas build` generates and stores the Android keystore for you. **Do not lose it** — back it up (`eas credentials`). Losing the upload key blocks future updates.
- [ ] Enroll in **Google Play App Signing** (default for new apps).

---

## 8. Pre-flight verification (do on a real device)

- [ ] `npx tsc --noEmit` passes (currently ✅) and `npm run lint` is clean.
- [ ] Build a **preview** APK and install on a physical Android phone:
  ```bash
  eas build --profile preview --platform android
  ```
- [ ] Smoke-test end to end against the **production** backend:
  - Sign up / sign in / sign out (Clerk).
  - Add a personal expense → Home & Insights update.
  - Add a split expense, add a group, settle up, delete a group/expense — confirm the styled toasts/dialogs appear.
  - **Set a profile photo from the gallery** (permission prompt + upload succeed).
  - Loading screen shows on cold start; nothing is hidden behind the floating tab bar.
  - Deep links / back-button behaviour feel right.

---

## 9. Build & submit

```bash
# 1. Production APK (for hosting on website)
eas build --profile production --platform android
```

- [ ] First upload can go to an **Internal testing** track before Production.
- [ ] After Google review, promote Internal → Closed/Open testing → Production.

---

## 10. Post-launch

- [ ] Set up **crash reporting** (Sentry / expo-insights) — not currently wired in.
- [ ] Decide on **OTA updates** via `expo-updates` (`eas update`) for JS-only fixes without a store re-review.
- [ ] Watch Play Console **vitals** (ANRs, crashes) for the first days.

---

### Quick reference — current state

| Item | Status |
|------|--------|
| `android.package` | ✅ `com.fingekko.app` (configured) |
| `eas.json` | ✅ created (with `autoIncrement`) |
| `versionCode` | ✅ configured via `autoIncrement` in `eas.json` |
| Production API URL | ✅ set to `https://api.fingekko.com` in `.env` (verify EAS env) |
| Production Clerk key | 🔴 use `pk_live_…` (pending user configuration) |
| Privacy policy | 🔴 required (user to provide URL) |
| Data safety form | 🔴 required (user to complete in Play Console) |
| Icons / splash | ✅ configured |
| TypeScript | ✅ passes |
