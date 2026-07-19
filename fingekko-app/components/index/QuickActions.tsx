import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { palette, radius, shadows, spacing } from '@/constants/design';
import AppText from '../ui/AppText';
import Icon from '../ui/Icon';

type Action = {
  icon: string;
  label: string;
  href: string;
  tint: string;
  fill: string;
};

/**
 * The four things people actually open the app to do, sitting directly under
 * the balance. Everything else moved to the side menu.
 */
const ACTIONS: Action[] = [
  { icon: 'Plus', label: 'Add', href: '/(tabs)/AddNewExpense', tint: palette.primaryDeep, fill: palette.primaryLight },
  { icon: 'Users', label: 'Split', href: '/(tabs)/YourGroups', tint: palette.info, fill: palette.infoLight },
  { icon: 'Wallet', label: 'Can I spend?', href: '/(tabs)/safe-to-spend', tint: palette.warning, fill: palette.warningLight },
  { icon: 'Target', label: 'Goals', href: '/(tabs)/goals', tint: palette.success, fill: palette.successLight },
];

export default function QuickActions() {
  return (
    <View style={styles.row}>
      {ACTIONS.map((action) => (
        <Pressable
          key={action.label}
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
          onPress={() => router.push(action.href as never)}
        >
          <View style={[styles.iconWrap, { backgroundColor: action.fill }]}>
            <Icon name={action.icon} size={20} color={action.tint} clickable={false} />
          </View>
          <AppText variant="micro" color="textSecondary" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {action.label}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: palette.card,
    borderRadius: radius.xl,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.sm,
    ...shadows.sm,
  },
  action: { flex: 1, alignItems: 'center', gap: 7 },
  actionPressed: { opacity: 0.6 },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
