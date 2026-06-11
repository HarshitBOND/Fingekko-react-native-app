import { Pressable, Text, TextInput, View } from 'react-native';
import { DEMO_CATEGORIES } from './constants';
import { styles } from './styles';

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
        <Pressable onPress={onToggleDemo} style={[styles.demoToggle, useDummyData && styles.demoToggleActive]}>
          <Text style={[styles.demoToggleText, useDummyData && styles.demoToggleTextActive]}>
            {useDummyData ? 'Disable demo' : 'Use demo data'}
          </Text>
        </Pressable>
      </View>

      {useDummyData ? (
        <View style={styles.demoControls}>
          <View style={styles.demoInputRow}>
            <TextInput
              placeholder="Amount"
              placeholderTextColor="rgba(85,112,100,0.55)"
              keyboardType="numeric"
              value={dummyAmount}
              onChangeText={onAmountChange}
              style={styles.demoInput}
            />
            <Pressable style={styles.demoAction} onPress={onAddExpense}>
              <Text style={styles.demoActionText}>Add expense</Text>
            </Pressable>
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