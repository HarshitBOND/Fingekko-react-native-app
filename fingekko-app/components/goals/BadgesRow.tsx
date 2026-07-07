import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { palette, radius, shadows, spacing } from '@/constants/design';
import type { BadgeDefinition, EarnedBadge } from '@/types';
import AppText from '../ui/AppText';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Icon from '../ui/Icon';

type BadgesRowProps = {
  earned: EarnedBadge[];
  catalog: BadgeDefinition[];
};

export default function BadgesRow({ earned, catalog }: BadgesRowProps) {
  const [detailVisible, setDetailVisible] = useState(false);
  const earnedIds = new Set(earned.map((b) => b.id));

  const sorted = [...catalog].sort((a, b) => {
    const aEarned = earnedIds.has(a.id);
    const bEarned = earnedIds.has(b.id);
    if (aEarned === bEarned) return 0;
    return aEarned ? -1 : 1;
  });

  return (
    <Card variant="elevated" padding={20} style={styles.card}>
      <View style={styles.headerRow}>
        <AppText variant="label" color="textPrimary" style={styles.title}>
          Badges
        </AppText>
        <Pressable style={styles.viewAll} onPress={() => setDetailVisible(true)}>
          <AppText variant="caption" color="primaryDeep" weight="bold">
            View all
          </AppText>
          <Icon name="ChevronRight" size={14} color={palette.primaryDeep} />
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgesRow}>
        {sorted.map((badge) => {
          const isEarned = earnedIds.has(badge.id);
          return (
            <View key={badge.id} style={styles.badgeItem}>
              <View style={[styles.badgeIconWrap, !isEarned && styles.badgeLocked]}>
                <Icon name={isEarned ? badge.icon : 'Lock'} size={isEarned ? 22 : 18} color={isEarned ? palette.primaryDeep : palette.textTertiary} />
              </View>
              <AppText
                variant="micro"
                color={isEarned ? 'textPrimary' : 'textTertiary'}
                align="center"
                style={styles.badgeLabel}
                numberOfLines={2}
              >
                {badge.label}
              </AppText>
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={detailVisible} animationType="slide" transparent onRequestClose={() => setDetailVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <AppText variant="title" color="textPrimary" weight="bold" style={{ marginBottom: spacing.md }}>
              All Badges
            </AppText>
            <ScrollView style={{ maxHeight: 420 }}>
              {catalog.map((badge) => {
                const isEarned = earnedIds.has(badge.id);
                return (
                  <View key={badge.id} style={styles.detailRow}>
                    <View style={[styles.detailIconWrap, !isEarned && styles.badgeLocked]}>
                      <Icon name={isEarned ? badge.icon : 'Lock'} size={18} color={isEarned ? palette.primaryDeep : palette.textTertiary} />
                    </View>
                    <View style={{ flex: 1, marginLeft: spacing.sm }}>
                      <AppText variant="bodySm" weight="bold" color={isEarned ? 'textPrimary' : 'textTertiary'}>
                        {badge.label}
                      </AppText>
                      <AppText variant="caption" color="textSecondary">
                        {badge.description}
                      </AppText>
                    </View>
                    {isEarned && <Icon name="Check" size={16} color={palette.success} />}
                  </View>
                );
              })}
            </ScrollView>
            <Button variant="outline" size="md" onPress={() => setDetailVisible(false)} style={{ marginTop: spacing.md }}>
              Close
            </Button>
          </View>
        </View>
      </Modal>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.lg },
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
    gap: spacing.md,
    paddingRight: spacing.sm,
  },
  badgeItem: {
    width: 76,
    alignItems: 'center',
    gap: spacing.xs,
  },
  badgeIconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primaryLight,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.xs,
  },
  badgeLocked: {
    backgroundColor: palette.bg,
    borderColor: palette.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  badgeLabel: {
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: palette.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: palette.divider,
  },
  detailIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primaryLight,
  },
});
