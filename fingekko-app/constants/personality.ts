/**
 * The six money personalities.
 *
 * Tiers describe what the type is *for*, and the copy follows from it:
 *   aspirational — the one people want; celebrate it.
 *   awareness    — a habit worth noticing; name it without scolding.
 *   engagement   — the user isn't really using the app; invite them back in.
 *
 * Tone rule: these describe behaviour, never the person. "Your spending is
 * concentrated" — not "you are bad with money". Nobody opens a finance app to
 * be told off.
 */

import type { ImageSourcePropType } from 'react-native';
import { palette } from './design';

/**
 * Character art, one per type.
 *
 * Pipeline: `assets/personality/*.svg` (design source, SVGO-optimised) → 512px
 * → 128-colour palette → lossless WebP. The sources are ~3,000 paths each, so
 * rendering them as SVG components would cost ~7.3MB of bundle and thousands of
 * native nodes per screen. As WebP the whole set is 108KB.
 *
 * Palette-then-lossless beats plain lossy WebP here: this is flat vector art, so
 * colour reduction is nearly free while DCT would spend bits on the hard edges.
 * Measured at the 132px render size the difference from the original is ~1%.
 *
 * Rendered with `expo-image`, not RN's `Image` — the latter cannot decode WebP
 * on iOS.
 */
const AVATARS: Record<PersonalityType, ImageSourcePropType> = {
  strategist: require('../assets/images/personality-strategist.webp'),
  impulse_comet: require('../assets/images/personality-impulse-comet.webp'),
  binge_beast: require('../assets/images/personality-binge-beast.webp'),
  social_butterfly: require('../assets/images/personality-social-butterfly.webp'),
  comfort_spender: require('../assets/images/personality-comfort-spender.webp'),
  ostrich: require('../assets/images/personality-ostrich.webp'),
};

export type PersonalityType =
  | 'strategist'
  | 'impulse_comet'
  | 'binge_beast'
  | 'social_butterfly'
  | 'comfort_spender'
  | 'ostrich';

export type PersonalityTier = 'aspirational' | 'awareness' | 'engagement';

export type PersonalityMeta = {
  id: PersonalityType;
  name: string;
  /** The one-liner from the logic doc — shown under the name. */
  tagline: string;
  tier: PersonalityTier;
  icon: string;
  /** Character illustration for this type. */
  avatar: ImageSourcePropType;
  color: string;
  tint: string;
  /** Two or three sentences: what this pattern looks like day to day. */
  description: string;
  /** What this type is genuinely good at. Every type gets real ones. */
  strengths: string[];
  /** Where it tends to cost them — framed as a watch-out, not a failing. */
  watchOuts: string[];
  /** One concrete thing to try next. */
  nudge: string;
};

export const PERSONALITIES: Record<PersonalityType, PersonalityMeta> = {
  strategist: {
    id: 'strategist',
    name: 'The Strategist',
    tagline: 'Every rupee has a plan',
    tier: 'aspirational',
    icon: 'Target',
    avatar: AVATARS.strategist,
    color: palette.primaryDeep,
    tint: palette.primaryLight,
    description:
      'You track consistently, spend at a steady pace, and your goals actually move. Money is a plan you follow, not a thing that happens to you.',
    strengths: [
      'You log reliably, so your numbers are real',
      'Steady day-to-day spending — few surprises',
      'Goals move because you feed them',
    ],
    watchOuts: [
      'Plans can get rigid — leave room for a spontaneous yes',
      'Tracking well is not the same as spending well; check the categories too',
    ],
    nudge: 'Set one slightly harder goal. You have the habit for it.',
  },

  impulse_comet: {
    id: 'impulse_comet',
    name: 'The Impulse Comet',
    tagline: 'Fast, frequent, ₹99 at a time',
    tier: 'awareness',
    icon: 'Zap',
    avatar: AVATARS.impulse_comet,
    color: palette.info,
    tint: palette.infoLight,
    description:
      'Lots of small purchases, most of them quick decisions. No single one feels like much — which is exactly why the total is surprising at the end of the month.',
    strengths: [
      'You rarely make big reckless purchases',
      'Your spending adapts fast when you decide to change it',
    ],
    watchOuts: [
      'Small amounts add up faster than they feel like they do',
      'Frequent taps make it hard to notice a rising month',
    ],
    nudge: 'Try a 10-minute pause before anything under ₹200. Most of it survives the wait — some of it will not.',
  },

  binge_beast: {
    id: 'binge_beast',
    name: 'The Binge Beast',
    tagline: 'Calm, calm, calm… then boom',
    tier: 'awareness',
    icon: 'Flame',
    avatar: AVATARS.binge_beast,
    color: palette.danger,
    tint: palette.dangerLight,
    description:
      'Quiet stretches broken by one big day. Most of your month is disciplined — the damage is concentrated in a handful of sessions.',
    strengths: [
      'Long stretches of genuinely low spending',
      'You are not leaking money daily — the pattern is contained',
    ],
    watchOuts: [
      'One session can undo three careful weeks',
      'Big days often arrive with a mood, not a decision',
    ],
    nudge: 'Look at your last peak day. What happened that morning? The trigger is usually not the spending itself.',
  },

  social_butterfly: {
    id: 'social_butterfly',
    name: 'The Social Butterfly',
    tagline: 'Your wallet has too many friends',
    tier: 'awareness',
    icon: 'Users',
    avatar: AVATARS.social_butterfly,
    color: palette.warning,
    tint: palette.warningLight,
    description:
      'A big share of your money moves with other people — shared meals, group plans, rounds you offered to cover. Your spending follows your calendar.',
    strengths: [
      'You invest in relationships, which is not a waste',
      'Splits mean you are already sharing costs rather than absorbing them',
    ],
    watchOuts: [
      'It is easy to say yes to the plan and work out the cost later',
      'Unsettled splits quietly become gifts',
    ],
    nudge: 'Settle your open splits this week. Then pick one plan a month you join without paying for.',
  },

  comfort_spender: {
    id: 'comfort_spender',
    name: 'The Comfort Spender',
    tagline: 'Same order. Same app. Every day',
    tier: 'awareness',
    icon: 'Coffee',
    avatar: AVATARS.comfort_spender,
    color: '#8B5CF6',
    tint: 'rgba(139, 92, 246, 0.12)',
    description:
      'One category takes most of your money, at a steady daily drip. No drama, no spikes — just the same comfortable habit, quietly compounding.',
    strengths: [
      'Predictable spending — easy to budget around',
      'No shock days; your month rarely surprises you',
    ],
    watchOuts: [
      'A steady habit is the easiest kind to stop noticing',
      'Concentration means one price rise hits your whole budget',
    ],
    nudge: 'Swap two days a week out of your top category. Same comfort, noticeably smaller total.',
  },

  ostrich: {
    id: 'ostrich',
    name: 'The Ostrich',
    tagline: "If I don't look, it doesn't count",
    tier: 'engagement',
    icon: 'EyeOff',
    avatar: AVATARS.ostrich,
    color: palette.textSecondary,
    tint: palette.cardMuted,
    description:
      "You are not logging often enough for us to read your pattern yet — and that avoidance is usually the most useful thing to notice. Money you don't look at doesn't get smaller.",
    strengths: [
      'You are here, which is the part most people skip',
      'A clean slate — no bad habits baked into your data yet',
    ],
    watchOuts: [
      'Unlogged spending is invisible spending',
      'The longer the gap, the harder the first entry feels',
    ],
    nudge: 'Log one expense today. Just one. The streak does the rest.',
  },
};

/** Display order: aspirational first, engagement last. */
export const PERSONALITY_ORDER: PersonalityType[] = [
  'strategist',
  'impulse_comet',
  'binge_beast',
  'social_butterfly',
  'comfort_spender',
  'ostrich',
];

export const TIER_LABEL: Record<PersonalityTier, string> = {
  aspirational: 'Aspirational',
  awareness: 'Awareness',
  engagement: 'Getting started',
};
