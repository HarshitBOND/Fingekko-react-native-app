import { Pressable, StyleSheet, View } from 'react-native';
import { palette, radius, spacing } from '@/constants/design';
import AppText from '../ui/AppText';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';
import { DEMO_CATEGORIES } from './constants';

type DemoDataCardProps = {
  useDummyData: boolean;
  dummyAmount: string;
  dummyCategory: string;
  onToggleDemo: () => void;
  onAmountChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onAddExpense: () => boolean;
  onResetSample: () => void;
};

export default function DemoDataCard({
  useDummyData,
  dummyAmount,
  dummyCategory,
  onToggleDemo,
  onAmountChange,
  onCategoryChange,
  onAddExpense,
  onResetSample,
}: DemoDataCardProps) {
  return (
    <Card variant="flat" padding={spacing.base} radius={radius.xl}>
      <View style={styles.headRow}>
        <View style={styles.copy}>
          <View style={styles.titleRow}>
            <View style={[styles.dot, { backgroundColor: useDummyData ? palette.success : palette.textTertiary }]} />
            <AppText variant="label">{useDummyData ? 'Demo data is on' : 'Demo data is off'}</AppText>
          </View>
          <AppText variant="caption" color="textSecondary" style={styles.sub}>
            Add a dummy expense to watch the balance, ring and weekly numbers update.
          </AppText>
        </View>
        <Button
          variant={useDummyData ? 'outline' : 'secondary'}
          size="sm"
          fullWidth={false}
          onPress={onToggleDemo}
        >
          {useDummyData ? 'Disable' : 'Enable'}
        </Button>
      </View>

      {useDummyData ? (
        <View style={styles.controls}>
          <View style={styles.inputRow}>
            <Input
              placeholder="Amount (₹)"
              keyboardType="numeric"
              value={dummyAmount}
              onChangeText={onAmountChange}
              containerStyle={styles.input}
            />
            <Button variant="primary" size="md" fullWidth={false} onPress={onAddExpense}>
              Add
            </Button>
          </View>

          <View style={styles.chipRow}>
            {DEMO_CATEGORIES.map((category) => {
              const selected = dummyCategory === category;
              return (
                <Pressable
                  key={category}
                  onPress={() => onCategoryChange(category)}
                  style={[styles.chip, selected && styles.chipActive]}
                >
                  <AppText variant="caption" color={selected ? 'primaryDeep' : 'textSecondary'}>
                    {category}
                  </AppText>
                </Pressable>
              );
            })}
            <Pressable onPress={onResetSample} style={styles.reset} hitSlop={6}>
              <AppText variant="caption" color="textTertiary">
                Reset
              </AppText>
            </Pressable>
          </View>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  copy: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  sub: { marginTop: 4 },
  controls: { marginTop: spacing.base, gap: spacing.md },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  input: { flex: 1 },
  chipRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: palette.bg,
    borderWidth: 1,
    borderColor: palette.border,
  },
  chipActive: { backgroundColor: palette.primaryLight, borderColor: palette.primary },
  reset: { marginLeft: 'auto', paddingHorizontal: 8, paddingVertical: 8 },
});
