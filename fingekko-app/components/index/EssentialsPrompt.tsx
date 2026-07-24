import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { palette, radius, spacing } from '@/constants/design';
import AppText from '../ui/AppText';
import Button from '../ui/Button';
import Icon from '../ui/Icon';

/**
 * Home prompt that gates the user into the essentials/recurring-bills form
 * (AUDIT item 10). Shown once income is set up and until they complete the form.
 * Until then, "safe to spend" can't reserve money for rent/bills, so we ask for
 * these before letting the budget picture claim to be accurate.
 */
export default function EssentialsPrompt() {
  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Icon name="ReceiptText" size={20} color={palette.warning} clickable={false} />
      </View>
      <View style={styles.body}>
        <AppText variant="bodySm" color="textPrimary" weight="bold">
          Add your monthly bills
        </AppText>
        <AppText variant="caption" color="textSecondary" style={styles.sub}>
          Tell us your rent, utilities, EMIs and subscriptions so we can reserve them from your
          &quot;safe to spend&quot; — otherwise the app can overstate what&apos;s free to spend.
        </AppText>
        <Button
          variant="primary"
          size="sm"
          fullWidth={false}
          onPress={() => router.push('/(tabs)/essentials?onboarding=1')}
          style={{ marginTop: spacing.sm }}
        >
          Set up bills
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.base,
    borderRadius: radius.lg,
    backgroundColor: palette.warningLight,
    borderWidth: 1,
    borderColor: palette.warning + '55',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  sub: { marginTop: 2 },
});
