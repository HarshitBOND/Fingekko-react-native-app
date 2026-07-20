import { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { layout, palette, radius, spacing } from '@/constants/design';
import AppText from './AppText';
import Icon from './Icon';

// A curated set of lucide icons relevant to spending/life, searchable by name.
// (The full lucide set is ~1,500 icons; a focused list keeps the grid fast and
// the choices meaningful.) Names must match lucide-react-native exports.
const ICON_NAMES = [
  'Utensils', 'Coffee', 'Pizza', 'Beer', 'Wine', 'IceCreamCone', 'ShoppingCart', 'ShoppingBag',
  'Gift', 'Cake', 'Apple', 'Croissant', 'Soup', 'Milk', 'Cookie',
  'Plane', 'Car', 'Bus', 'TrainFront', 'Bike', 'Fuel', 'MapPin', 'Ship', 'TramFront', 'CarTaxiFront',
  'House', 'BedDouble', 'Sofa', 'Lightbulb', 'Plug', 'Wifi', 'Droplet', 'Flame', 'Wrench', 'Hammer',
  'ReceiptText', 'CreditCard', 'Wallet', 'Banknote', 'Coins', 'PiggyBank', 'Landmark', 'HandCoins',
  'Clapperboard', 'Film', 'Music', 'Gamepad2', 'Ticket', 'Popcorn', 'PartyPopper', 'Dumbbell',
  'HeartPulse', 'Pill', 'Stethoscope', 'Cross', 'Syringe', 'Activity',
  'GraduationCap', 'BookOpen', 'Pencil', 'Backpack', 'Laptop', 'Smartphone', 'Headphones', 'Camera',
  'Shirt', 'Footprints', 'Scissors', 'Glasses', 'Watch', 'Gem',
  'Dog', 'Cat', 'PawPrint', 'Baby', 'Flower', 'TreePine', 'Leaf', 'Sun',
  'Briefcase', 'Building2', 'Users', 'User', 'Phone', 'Mail', 'Globe', 'Calendar',
  'Tag', 'Star', 'Heart', 'Zap', 'Trophy', 'Target', 'Rocket', 'Sparkles', 'CircleDollarSign',
];

type Props = {
  visible: boolean;
  value?: string;
  onClose: () => void;
  onSelect: (iconName: string) => void;
};

export default function IconPickerModal({ visible, value, onClose, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<string>('');

  useEffect(() => {
    if (visible) {
      setQuery('');
      setPicked(value || '');
    }
  }, [visible, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ICON_NAMES;
    return ICON_NAMES.filter((n) => n.toLowerCase().includes(q));
  }, [query]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.page} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable style={styles.headerBtn} onPress={onClose} hitSlop={6}>
            <Icon name="ArrowLeft" size={22} color={palette.textPrimary} clickable={false} />
          </Pressable>
          <AppText variant="title" weight="bold">Choose an icon</AppText>
          <Pressable
            style={[styles.useBtn, !picked && { opacity: 0.5 }]}
            disabled={!picked}
            onPress={() => picked && onSelect(picked)}
            hitSlop={6}
          >
            <AppText variant="label" color="onDark">Use icon</AppText>
          </Pressable>
        </View>

        <View style={styles.searchBar}>
          <Icon name="Search" size={16} color={palette.textTertiary} clickable={false} />
          <TextInput
            placeholder="Search icons (e.g. food, car, gift)"
            placeholderTextColor={palette.textTertiary}
            value={query}
            onChangeText={setQuery}
            style={styles.searchInput}
            autoCapitalize="none"
          />
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(n) => n}
          numColumns={4}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
          columnWrapperStyle={{ gap: spacing.sm }}
          ListEmptyComponent={
            <AppText variant="bodySm" color="textSecondary" align="center" style={{ marginTop: spacing.xl }}>
              No icons match “{query}”.
            </AppText>
          }
          renderItem={({ item }) => {
            const active = picked === item;
            return (
              <Pressable
                style={[styles.cell, active && styles.cellActive]}
                onPress={() => setPicked(item)}
              >
                <Icon name={item} size={26} color={active ? palette.primaryDeep : palette.textPrimary} clickable={false} />
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.gutter,
    paddingVertical: spacing.md,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  useBtn: {
    backgroundColor: palette.primaryDeep,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: layout.gutter,
    marginBottom: spacing.sm,
    backgroundColor: palette.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  searchInput: { flex: 1, fontSize: 14, color: palette.textPrimary, padding: 0 },
  cell: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: '23%',
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: palette.border,
    backgroundColor: palette.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellActive: { borderColor: palette.primary, backgroundColor: palette.primaryLight },
});
