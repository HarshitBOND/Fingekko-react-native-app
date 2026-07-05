import { Text, View, Pressable } from 'react-native';
import { DEMO_CATEGORIES } from './constants';
import { styles } from './styles';
import Input from '../ui/Input';
import Button from '../ui/Button';

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
    <>
      <View style={styles.demoCard}>
        <View style={styles.demoCopy}>
          <Text style={styles.demoTitle}>{useDummyData ? 'Demo data is on' : 'Demo data is off'}</Text>
          <Text style={styles.demoSubTitle}>Add a dummy expense to watch the balance, ring, and weekly numbers update.</Text>
        </View>
        <Button
          variant={useDummyData ? 'danger' : 'outline'}
          size="sm"
          onPress={onToggleDemo}
          style={{ width: 'auto', minWidth: 110 }}
        >
          {useDummyData ? 'Disable demo' : 'Use demo data'}
        </Button>
      </View>

      {useDummyData ? (
        <View style={styles.demoControls}>
          <View style={styles.demoInputRow}>
            <Input
              placeholder="Amount"
              keyboardType="numeric"
              value={dummyAmount}
              onChangeText={onAmountChange}
              containerStyle={{ flex: 1 }}
            />
            <Button
              variant="secondary"
              size="md"
              onPress={onAddExpense}
              style={{ width: 'auto' }}
            >
              Add expense
            </Button>
          </View>

          <View style={styles.demoCategoryRow}>
            {DEMO_CATEGORIES.map((category) => {
              const selected = dummyCategory === category;
              return (
                <Pressable
                  key={category}
                  onPress={() => onCategoryChange(category)}
                  style={[styles.categoryChip, selected && styles.categoryChipActive]}
                >
                  <Text style={[styles.categoryChipText, selected && styles.categoryChipTextActive]}>{category}</Text>
                </Pressable>
              );
            })}
            <Pressable onPress={onResetSample} style={styles.resetDemoButton}>
              <Text style={styles.resetDemoText}>Reset sample</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </>
  );
}