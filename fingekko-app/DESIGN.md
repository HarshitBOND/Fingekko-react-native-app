---
name: Fingekko
description: A calm, premium fintech language for a gamified money app — soft floating surfaces, generous spacing, and a single confident green.
colors:
  fresh-growth-green: "#66CC44"
  green-deep: "#3E6E42"
  green-dark: "#2C5230"
  green-bright: "#7BD957"
  green-tint: "#EAF8E5"
  bg: "#F7F8F6"
  surface: "#FFFFFF"
  surface-muted: "#FBFCFB"
  ink: "#1E1E1E"
  ink-secondary: "#6E6E73"
  ink-tertiary: "#9A9AA0"
  success: "#5CB85C"
  success-tint: "#E7F6E7"
  warning: "#F5B84D"
  warning-tint: "#FDF3E1"
  danger: "#E85D5D"
  danger-tint: "#FBE9E9"
  info: "#5B9BD5"
  info-tint: "#E9F1FB"
  border: "#ECECEC"
  border-strong: "#E0E0E0"
  divider: "#F0F0EF"
typography:
  display:
    fontFamily: "Plus Jakarta Sans ExtraBold, System"
    fontSize: "40px"
    fontWeight: 800
    lineHeight: "46px"
    letterSpacing: "-0.5px"
  hero:
    fontFamily: "Plus Jakarta Sans ExtraBold, System"
    fontSize: "34px"
    fontWeight: 800
    lineHeight: "40px"
    letterSpacing: "-0.4px"
  h1:
    fontFamily: "Plus Jakarta Sans Bold, System"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: "34px"
    letterSpacing: "-0.3px"
  h2:
    fontFamily: "Plus Jakarta Sans Bold, System"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: "28px"
    letterSpacing: "-0.2px"
  title:
    fontFamily: "Plus Jakarta Sans SemiBold, System"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: "24px"
    letterSpacing: "-0.1px"
  body:
    fontFamily: "Plus Jakarta Sans Regular, System"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
  bodySm:
    fontFamily: "Plus Jakarta Sans Regular, System"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "22px"
  label:
    fontFamily: "Plus Jakarta Sans SemiBold, System"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: "20px"
  caption:
    fontFamily: "Plus Jakarta Sans Medium, System"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: "18px"
  micro:
    fontFamily: "Plus Jakarta Sans SemiBold, System"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: "14px"
    letterSpacing: "0.3px"
  money:
    fontFamily: "Plus Jakarta Sans Bold, System"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: "30px"
    letterSpacing: "-0.3px"
  moneyLg:
    fontFamily: "Plus Jakarta Sans ExtraBold, System"
    fontSize: "34px"
    fontWeight: 800
    lineHeight: "40px"
    letterSpacing: "-0.6px"
rounded:
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
  xxl: "28px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  base: "16px"
  lg: "20px"
  xl: "24px"
  xxl: "32px"
  xxxl: "40px"
  huge: "48px"
components:
  button-primary:
    backgroundColor: "{colors.fresh-growth-green}"
    textColor: "{colors.surface}"
    rounded: "{rounded.pill}"
    padding: "16px 22px"
  button-secondary:
    backgroundColor: "{colors.green-tint}"
    textColor: "{colors.green-deep}"
    rounded: "{rounded.pill}"
    padding: "16px 22px"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "16px 22px"
  card-elevated:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "20px"
  card-tinted:
    backgroundColor: "{colors.green-tint}"
    rounded: "{rounded.xl}"
    padding: "20px"
  input-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    height: "56px"
    padding: "0 16px"
  badge-primary:
    backgroundColor: "{colors.green-tint}"
    textColor: "{colors.green-deep}"
    rounded: "{rounded.pill}"
    padding: "5px 11px"
---

# Design System: Fingekko

## 1. Overview

**Creative North Star: "The Calm Ledger"**

Fingekko reads like a premium, trustworthy financial record that quietly rewards you for keeping it — never a rewards app that happens to track money. Every surface is soft, rounded, and generously spaced, so that expense tracking, group settlements, and streaks all sit inside the same unhurried system. The single Fresh Growth Green accent carries meaning wherever it appears — progress, brand, completion — while the rest of the interface stays a calm off-white and near-black neutral scale. Depth comes from soft, diffuse shadows and a single deliberate frosted-glass moment (the floating tab bar), not from gradients, glows, or decorative texture.

This system explicitly rejects the cartoon-mascot, confetti-first energy of gamified rewards apps (no badges-as-decoration, no loud celebratory chrome competing with the numbers) and the dense, gray, spreadsheet feel of legacy finance tools (no cramped tables, no utilitarian gray-on-gray). Encouragement is expressed through restrained motion and typography weight, not through noise.

**Key Characteristics:**
- One brand color (Fresh Growth Green), used deliberately rather than everywhere
- Soft, rounded surfaces at every scale — cards, buttons, inputs, the tab bar itself
- Money-first typography: numeric values get their own weighted, tightly-tracked type roles (`money`, `moneyLg`)
- Layered elevation via soft, colored-dark shadows rather than hard black drop shadows
- Generous 4pt-scale spacing; nothing crowds

## 2. Colors

A single confident green against warm-neutral off-white and near-black, with a conventional semantic status set for financial states (income/expense/savings, success/warning/danger/info).

### Primary
- **Fresh Growth Green** (#66CC44): the brand color — primary buttons, active tab states, progress rings, focus borders. Used deliberately, not as a wash across the UI.
- **Green Deep** (#3E6E42): text-on-tint and pressed/active states where Fresh Growth Green would fail contrast (e.g. text over Green Tint).
- **Green Dark** (#2C5230): deepest brand step, reserved for gradient ends and dark brand surfaces.
- **Green Bright** (#7BD957): gradient start for primary CTAs and the center FAB — never used flat/solid.
- **Green Tint** (#EAF8E5): soft brand wash for secondary buttons, tinted cards, active tab-icon pills.

### Neutral
- **BG** (#F7F8F6): app background — a barely-there warm-neutral, not pure white.
- **Surface** (#FFFFFF): cards, modals, inputs, sheets.
- **Surface Muted** (#FBFCFB): subtle secondary surface for nested content on top of Surface.
- **Ink** (#1E1E1E): primary text.
- **Ink Secondary** (#6E6E73): secondary/supporting text — labels, captions, metadata.
- **Ink Tertiary** (#9A9AA0): placeholder text, inactive tab icons, disabled content.
- **Border** (#ECECEC) / **Border Strong** (#E0E0E0): hairline dividers and input/outline borders.
- **Divider** (#F0F0EF): list-row separators.

### Status
- **Success** (#5CB85C) / **Success Tint** (#E7F6E7): income, completed goals, positive deltas.
- **Warning** (#F5B84D) / **Warning Tint** (#FDF3E1): budget approaching limit, pending states.
- **Danger** (#E85D5D) / **Danger Tint** (#FBE9E9): expenses, overdue goals, destructive actions.
- **Info** (#5B9BD5) / **Info Tint** (#E9F1FB): savings, informational callouts.

### Named Rules
**The One Accent Rule.** Fresh Growth Green is the only saturated brand color in the system. Status colors (success/warning/danger/info) exist strictly for semantic meaning — income vs. expense, on-track vs. overdue — never as decorative alternatives to brand green.

**The Tint-Not-Wash Rule.** Green Tint (#EAF8E5) is a background wash for small, deliberate surfaces (a secondary button, an active tab pill, a tinted card) — never a full-screen background. Full screens stay on BG or Surface.

## 3. Typography

**Display/Body Font:** Plus Jakarta Sans (System sans-serif fallback on load failure)

**Character:** A single geometric-humanist sans carrying every role via weight, not a font pairing — extrabold for money and hero moments, regular/medium for body and supporting text. This keeps the system calm (no competing typefaces) while still giving numbers visual authority through weight alone.

### Hierarchy
- **Display** (ExtraBold 800, 40px/46px, -0.5px): rare, top-of-screen moments only.
- **Hero** (ExtraBold 800, 34px/40px, -0.4px): screen-level headlines (e.g. a goal's headline progress).
- **H1** (Bold 700, 28px/34px, -0.3px): section-level headings.
- **H2** (Bold 700, 22px/28px, -0.2px): sub-section headings.
- **Title** (SemiBold 600, 18px/24px, -0.1px): card titles, list-section titles.
- **Body** (Regular 400, 16px/24px): primary reading text; cap prose at 65–75ch even though most content here is short-form.
- **Body Small** (Regular 400, 15px/22px): secondary reading text, descriptions.
- **Label** (SemiBold 600, 14px/20px): form labels, input labels, emphasized short text.
- **Caption** (Medium 500, 13px/18px): supporting metadata under a title (e.g. stat card sublabels).
- **Micro** (SemiBold 600, 11px/14px, +0.3px): smallest UI text — tab labels, tiny badges.
- **Money** (Bold 700, 24px/30px, -0.3px): standard transaction/balance amounts.
- **Money Large** (ExtraBold 800, 34px/40px, -0.6px): hero balance figures (home screen, goal totals).

### Named Rules
**The Money-First Rule.** Any numeric currency value gets a dedicated `money` or `moneyLg` role, never `body` or `h1` repurposed — the tighter tracking and heavier weight is what makes a number read as *money* rather than as generic text.

## 4. Elevation

Fingekko uses soft, diffuse shadow elevation, not tonal-only flatness — surfaces are meant to feel like they're gently floating above the background, never pinned flat to it. Shadows are colored (a dark green-black, `#1B2A1B`, not pure black) and wide-radius/low-opacity rather than tight and dark, which keeps them premium instead of skeuomorphic. The one exception to "shadows, not glass" is the floating tab bar, which uses a genuine frosted-glass blur (`expo-blur`, intensity 40, light tint) — a single deliberate native material moment, not a decorative pattern repeated elsewhere.

### Shadow Vocabulary
- **xs** (`shadowOpacity 0.04, shadowRadius 8, y 2`): hairline lift — flat-variant cards, small buttons.
- **sm** (`shadowOpacity 0.05, shadowRadius 12, y 4`): default small-surface lift — stat cards, header buttons.
- **md** (`shadowOpacity 0.07, shadowRadius 20, y 8`): standard card elevation — the default `elevated` Card variant.
- **lg** (`shadowOpacity 0.1, shadowRadius 28, y 12`): prominent floating elements — the tab bar shell.
- **xl** (`shadowOpacity 0.14, shadowRadius 36, y 18`): rare, maximum lift for modals/sheets.
- **primary** (`shadowColor #3E6E42, shadowOpacity 0.28, shadowRadius 16, y 8`): green-tinted glow reserved for primary gradient CTAs and the center FAB — this is the one shadow allowed to carry brand color instead of neutral dark.

### Named Rules
**The Soft-Floating Rule.** Every shadow is wide-radius and low-opacity. A tight, dark, hard-edged shadow reads as a 2014-era Material app; if a shadow looks like it was cut out with scissors, the radius is too small and the opacity too high.

**The One Glass Rule.** Frosted blur is reserved for the floating tab bar alone. No other card, header, or modal uses `expo-blur` or a translucent glass treatment — glassmorphism as a general decoration is explicitly rejected.

## 5. Components

### Buttons
- **Shape:** full pill (`radius: 999px`) at every size (sm 44px / md 52px / lg 56px height).
- **Primary:** Green Bright → Fresh Growth Green diagonal gradient fill, white bold text, `shadows.primary` green glow beneath.
- **Secondary:** Green Tint fill, Green Deep text, no shadow beyond a hairline `xs`.
- **Outline:** Surface fill with a 1.5px Border Strong stroke, Ink text — used where a button must not compete with a primary action nearby.
- **Ghost:** transparent fill, Green Deep text — lowest-emphasis action.
- **Danger/Success:** same pill shape and gradient treatment as Primary, swapped to the Danger/Success hue pair.
- **Disabled:** 0.55 opacity on the whole shell, no separate disabled palette.
- **Press feedback:** scale-down on press (via `PressableScale`), not a color change — keeps the calm, non-flashy feel.

### Badges
- **Style:** full pill, tone-based (primary/success/warning/danger/info/neutral), each with a soft tint background + matching darker foreground text by default.
- **Solid variant:** same tones at full saturation with white text — reserved for high-emphasis moments (e.g. a live count).

### Cards / Containers
- **Corner Style:** 20px (`radius.xl`) by default; flatter contexts can drop to 16px.
- **Elevated (default):** Surface white + `shadows.md`.
- **Flat:** Surface white + 1px Border hairline + `shadows.xs` — for dense lists where heavy elevation would be noisy.
- **Tinted:** Green Tint fill, no shadow — used to mark a card as brand-affiliated (e.g. a streak or reward card) without adding visual weight.
- **Dark:** Green Deep fill + `shadows.md` — rare, high-emphasis card (e.g. a hero summary).
- **Internal Padding:** 20px (`layout.cardPadding`) standard.

### Inputs / Fields
- **Style:** Surface white fill, 1.5px Border stroke, 20px (`radius.lg`) corners, 56px height.
- **Focus:** border color animates from Border to Fresh Growth Green over 180ms, paired with a subtle green shadow glow fading in — never an instant hard color snap.
- **Error:** border switches to Danger; error text in Danger below the field.
- **Label:** SemiBold 14px, Ink Secondary at rest, Green Deep when the field is focused.

### Navigation
- **Style:** a floating, frosted-glass pill tab bar (16px inset from both edges, `radius.xxl` corners), not a full-width bar pinned flush to the screen edge — reinforces the "floating surface" language from Elevation.
- **States:** active tab shows a Green Tint pill behind the icon plus Green Deep icon/label color; inactive icons/labels sit at Ink Tertiary. No active underline or dot indicator — the pill background is the only active signal.
- **Center action:** the middle tab is replaced entirely by a raised circular gradient FAB (58px, Green Bright→Green gradient, `shadows.primary` glow) rather than a fifth tab icon — a deliberate one-off, not a pattern to repeat elsewhere in the bar.
- **Header:** a lightweight top bar (menu affordance + notification bell + avatar) rather than a title bar — no back-arrow-and-title convention; navigation depth is implied by the screen content itself.

## 6. Do's and Don'ts

### Do:
- **Do** keep Fresh Growth Green (#66CC44) as the only saturated brand color; status colors exist for semantic meaning only.
- **Do** use full pill radius (999px) on every button and the tab bar, 20–24px on cards — soft and rounded, never sharp.
- **Do** give every currency figure the `money` or `moneyLg` type role, not a repurposed heading style.
- **Do** keep shadows wide-radius and low-opacity (`shadows.sm`/`md`/`lg`), colored with the dark-green-black `#1B2A1B` rather than pure black.
- **Do** pair every status color with an icon or label, never rely on color alone (income vs. expense, on-track vs. overdue).
- **Do** animate focus and press states gently (180–300ms, ease-out) — feedback should feel calm, not snappy or bouncy.

### Don't:
- **Don't** introduce a second saturated brand hue — no purple, gold, or neon accent competing with the green.
- **Don't** add cartoon mascots, confetti bursts, or badge-as-decoration gamification chrome — celebration is expressed through motion and copy, never through loud illustrated elements.
- **Don't** build dense, gray, spreadsheet-style tables — this is the legacy-finance-app anti-reference the product explicitly rejects.
- **Don't** use `border-left`/`border-right` colored stripes as a card accent anywhere.
- **Don't** use frosted glass/blur outside the floating tab bar — it's a single deliberate native material, not a general-purpose decoration.
- **Don't** use hard, tight, dark drop shadows (small radius + high opacity) — that reads as a dated 2014-era app, not a premium one.
- **Don't** let placeholder or tertiary text drop below AA contrast against Surface/BG — Ink Tertiary (#9A9AA0) is already near the contrast floor; don't go lighter.
