import { Dimensions, StyleSheet, View } from 'react-native';
// expo-image, not RN's Image: RN cannot decode WebP on iOS.
import { Image } from 'expo-image';
import { gradients, palette, radius, spacing } from '@/constants/design';
import { PERSONALITIES, TIER_LABEL, type PersonalityType } from '@/constants/personality';
import { formatCurrencyCopy } from '@/utils/currency';
import AppText from '../ui/AppText';
import HeroCard from '../ui/HeroCard';
import Icon from '../ui/Icon';

type PersonalityCardProps = {
  type: PersonalityType;
  /** Runner-up when the user sits between two types (confidence < 15%). */
  secondaryType?: PersonalityType | null;
  /** 0–1 gap between winner and runner-up. */
  confidence?: number;
  /** The engine's evidence lines — what actually produced this verdict. */
  drivers?: { signal: string; label: string }[];
};

/**
 * The character sits on its own row rather than beside the copy. Sharing a row
 * capped it at ~130px against the text column, which is too small to read as a
 * character at all — it just looked like a smudge in the corner of the card.
 */
const AVATAR = Math.min(220, Math.round(Dimensions.get('window').width * 0.56));

/**
 * The money-personality card: character art, the verdict, and the evidence
 * behind it.
 *
 * Lives on the Personality screen (opened from the Home quick action). Kept as
 * its own component so the same card can later sit on Home or in a share sheet
 * without the surrounding screen coming with it.
 */
export default function PersonalityCard({
  type,
  secondaryType,
  confidence,
  drivers = [],
}: PersonalityCardProps) {
  const meta = PERSONALITIES[type];
  const secondary = secondaryType ? PERSONALITIES[secondaryType] : null;

  return (
    <HeroCard colors={gradients.hero} padding={22}>
      {/* The character carries the type — it reads before any of the words do. */}
      <View style={styles.avatarStage}>
        <Image source={meta.avatar} style={styles.avatar} contentFit="contain" transition={180} />
      </View>

      <View style={{ gap: 2 }}>
        <AppText variant="micro" color="onDarkMuted" align="center" style={styles.eyebrow}>
          YOUR MONEY PERSONALITY
        </AppText>
        <AppText variant="h1" color="onDark" align="center">
          {meta.name}
        </AppText>
        <AppText variant="bodySm" color="onDarkMuted" align="center">
          {formatCurrencyCopy(meta.tagline)}
        </AppText>
      </View>

      <View style={styles.chipRow}>
        <View style={styles.chip}>
          <AppText variant="micro" color="onDark">
            {TIER_LABEL[meta.tier]}
          </AppText>
        </View>
        {typeof confidence === 'number' && (
          <View style={styles.chip}>
            <AppText variant="micro" numeric color="onDark">
              {Math.round(confidence * 100)}% match
            </AppText>
          </View>
        )}
      </View>

      {secondary && (
        <View style={styles.hybridRow}>
          <Icon name="Sparkles" size={13} color={palette.white} clickable={false} />
          <AppText variant="caption" color="onDark" style={{ flex: 1 }}>
            …with {secondary.name.replace(/^The /, '')} tendencies. You sit between the two.
          </AppText>
        </View>
      )}

      {drivers.length > 0 && (
        <View style={styles.drivers}>
          {drivers.map((driver) => (
            <View key={driver.signal} style={styles.driverRow}>
              <View style={styles.driverDot} />
              <AppText variant="caption" color="onDarkMuted" style={{ flex: 1 }}>
                {driver.label}
              </AppText>
            </View>
          ))}
        </View>
      )}
    </HeroCard>
  );
}

const styles = StyleSheet.create({
  avatarStage: { alignItems: 'center', marginBottom: spacing.md },
  eyebrow: { letterSpacing: 1 },
  avatar: { width: AVATAR, height: AVATAR },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  hybridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  drivers: {
    marginTop: spacing.md,
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.18)',
  },
  driverRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  driverDot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: palette.primaryBright,
    marginTop: 7,
  },
});
