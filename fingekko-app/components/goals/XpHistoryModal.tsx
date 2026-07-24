import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { palette, radius, spacing } from '@/constants/design';
import type { XpEventDto } from '@/types';
import AppText from '../ui/AppText';
import Badge from '../ui/Badge';
import EmptyState from '../ui/EmptyState';
import Icon from '../ui/Icon';

type XpHistoryModalProps = {
  visible: boolean;
  events: XpEventDto[];
  loading: boolean;
  onClose: () => void;
};

const ICON_BY_TYPE: Record<string, string> = {
  goal_created: 'Plus',
  goal_contribution: 'Zap',
  milestone: 'Star',
  goal_completed: 'Trophy',
  badge_unlocked: 'Award',
};

function relativeTime(ts: number): string {
  const diffMs = Date.now() - ts;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export default function XpHistoryModal({ visible, events, loading, onClose }: XpHistoryModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay} accessibilityViewIsModal={true}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <AppText variant="title" weight="bold" color="textPrimary">
              XP History
            </AppText>
            <Pressable onPress={onClose} hitSlop={8}>
              <Icon name="X" size={20} color={palette.textSecondary} />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={palette.primaryDeep} />
            </View>
          ) : events.length === 0 ? (
            <EmptyState icon="Zap" title="No activity yet" subtitle="Add funds to a goal to start earning XP." />
          ) : (
            <ScrollView style={styles.list}>
              {events.map((event) => (
                <View key={event.id} style={styles.row}>
                  <View style={styles.iconWrap}>
                    <Icon name={ICON_BY_TYPE[event.type] ?? 'Zap'} size={18} color={palette.primaryDeep} />
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing.sm }}>
                    <AppText variant="bodySm" weight="bold" color="textPrimary">
                      {event.description}
                    </AppText>
                    <AppText variant="micro" color="textTertiary">
                      {relativeTime(event.createdAt)}
                    </AppText>
                  </View>
                  <Badge label={`+${event.amount} XP`} tone="warning" />
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: palette.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    maxHeight: '80%',
    minHeight: 300,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  centerBox: { paddingVertical: spacing.xxxl, alignItems: 'center' },
  list: { maxHeight: 460 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: palette.divider,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primaryLight,
  },
});
