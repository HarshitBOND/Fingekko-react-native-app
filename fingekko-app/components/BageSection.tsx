import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { palette, spacing, radius, shadows, fontFamily } from '@/constants/design';
import AppText from './ui/AppText';
import Icon from './ui/Icon';
import Card from './ui/Card';

const badges = [
  {
    id: 'smart-saver',
    label: 'Smart Saver',
    source: require('../assets/images/leafSaberBadgelv1.png'),
  },
  {
    id: 'goal-getter',
    label: 'Goal Getter',
    source: require('../assets/images/badgelv1.png'),
  },
  {
    id: 'consistent',
    label: 'Consistent',
    source: require('../assets/images/leafSaberBadgelv1.png'),
  },
  {
    id: 'discipline-pro',
    label: 'Discipline Pro',
    locked: true,
  },
];

export default function BageSection() {
  return (
    <Card variant="elevated" padding={20}>
      <View style={styles.headerRow}>
        <AppText variant="label" color="textPrimary" style={styles.title}>
          Badges
        </AppText>
        <View style={styles.viewAll}>
          <AppText variant="caption" color="primaryDeep" weight="bold">
            View all
          </AppText>
          <Icon name="ChevronRight" size={14} color={palette.primaryDeep} />
        </View>
      </View>

      <View style={styles.badgesRow}>
        {badges.map((badge) => (
          <View key={badge.id} style={styles.badgeItem}>
            <View style={[styles.badgeIconWrap, badge.locked && styles.badgeLocked]}>
              {badge.locked ? (
                <Icon name="Lock" size={18} color={palette.textTertiary} />
              ) : (
                <Image source={badge.source} style={styles.badgeImage} />
              )}
            </View>
            <AppText
              variant="micro"
              color={badge.locked ? 'textTertiary' : 'textPrimary'}
              align="center"
              style={styles.badgeLabel}
              numberOfLines={2}
            >
              {badge.label}
            </AppText>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  viewAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  badgeItem: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  badgeIconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFEFA6', // soft warm yellow tint
    borderWidth: 1,
    borderColor: 'rgba(255, 230, 0, 0.2)',
    ...shadows.xs,
  },
  badgeImage: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  badgeLocked: {
    backgroundColor: palette.bg,
    borderColor: palette.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  badgeLabel: {
    marginTop: 4,
    fontFamily: fontFamily.semibold,
  },
});

