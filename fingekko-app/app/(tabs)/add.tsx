// app/(tabs)/add.tsx
// ➕ ADD TRANSACTION SCREEN
// Concepts: useState, forms, TypeScript, AsyncStorage, conditional rendering

import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, FontSizes, Spacing } from '../../constants/Colors';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../constants/categories';
import { TransactionType, Category } from '../../constants/types';
import { saveTransaction } from '../../utils/storage';
import { generateId, getTodayString } from '../../utils/helpers';

export default function AddScreen() {

  // ─── State ──────────────────────────────────────────────────────
  // useState<Type>(initialValue) — React remembers this between renders

  const [type, setType]           = useState<TransactionType>('expense');
  const [amount, setAmount]       = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [note, setNote]           = useState<string>('');
  const [isSaving, setIsSaving]   = useState<boolean>(false);

  // Which categories to show depends on the selected type
  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  // ─── Save Handler ────────────────────────────────────────────────
  async function handleSave() {
    // Validate inputs before saving
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Oops!', 'Please enter a valid amount');
      return;
    }
    if (!selectedCategory) {
      Alert.alert('Oops!', 'Please select a category');
      return;
    }

    setIsSaving(true);

    try {
      await saveTransaction({
        id: generateId(),
        type,
        amount: parseFloat(amount),
        category: selectedCategory.id,
        date: getTodayString(),
        createdAt: Date.now(),
      });

      // Reset form after saving
      setAmount('');
      setSelectedCategory(null);
      setNote('');

      Alert.alert(
        '✅ Saved!',
        `${type === 'income' ? 'Income' : 'Expense'} of ₹${amount} added`,
        [{ text: 'OK', onPress: () => router.push('/(tabs)') }]
      );
    } catch (error) {
      Alert.alert('Error', 'Could not save transaction');
    } finally {
      setIsSaving(false);    // Always runs — success or failure
    }
  }

  // ─── Render ──────────────────────────────────────────────────────
  return (
    // KeyboardAvoidingView — pushes content up when keyboard appears
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>

          {/* ── Header ── */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Add Transaction</Text>
            <Text style={styles.headerSubtitle}>Track every rupee 💚</Text>
          </View>

          {/* ── Income / Expense Toggle ── */}
          <View style={styles.typeToggle}>

            <TouchableOpacity
              style={[
                styles.typeButton,
                type === 'expense' && styles.typeButtonActiveExpense
              ]}
              onPress={() => {
                setType('expense');
                setSelectedCategory(null);   // Reset category on type change
              }}
            >
              <Text style={[
                styles.typeButtonText,
                type === 'expense' && styles.typeButtonTextActive
              ]}>
                💸 Expense
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeButton,
                type === 'income' && styles.typeButtonActiveIncome
              ]}
              onPress={() => {
                setType('income');
                setSelectedCategory(null);
              }}
            >
              <Text style={[
                styles.typeButtonText,
                type === 'income' && styles.typeButtonTextActive
              ]}>
                💰 Income
              </Text>
            </TouchableOpacity>

          </View>

          {/* ── Amount Input ── */}
          <View style={styles.amountContainer}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}           // Updates state on every keystroke
              placeholder="0"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="numeric"             // Shows number keyboard on phone
              maxLength={8}
            />
          </View>

          {/* ── Category Selector ── */}
          <Text style={styles.sectionLabel}>Category</Text>
          <View style={styles.categoriesGrid}>
            {categories.map((cat) => (
              // .map() = loop through array, return JSX for each item
              <TouchableOpacity
                key={cat.id}                     // React needs unique key in lists
                style={[
                  styles.categoryChip,
                  selectedCategory?.id === cat.id && styles.categoryChipSelected
                ]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                <Text style={[
                  styles.categoryLabel,
                  selectedCategory?.id === cat.id && styles.categoryLabelSelected
                ]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Note Input ── */}
          <Text style={styles.sectionLabel}>Note (optional)</Text>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="e.g. Swiggy order, salary..."
            placeholderTextColor={Colors.textSecondary}
            multiline
            maxLength={100}
          />

          {/* ── Save Button ── */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              isSaving && styles.saveButtonDisabled
            ]}
            onPress={handleSave}
            disabled={isSaving}
          >
            <Text style={styles.saveButtonText}>
              {isSaving ? 'Saving...' : '✅ Save Transaction'}
            </Text>
          </TouchableOpacity>

          {/* Bottom padding so button isn't behind tab bar */}
          <View style={{ height: 100 }} />

        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.base,
  },
  headerTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  typeToggle: {
    flexDirection: 'row',          // side by side (like flex-direction: row in CSS)
    marginHorizontal: Spacing.xl,
    backgroundColor: Colors.border,
    borderRadius: 12,
    padding: 4,
    marginBottom: Spacing.xl,
  },
  typeButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: 10,
  },
  typeButtonActiveExpense: {
    backgroundColor: Colors.expense,
  },
  typeButtonActiveIncome: {
    backgroundColor: Colors.income,
  },
  typeButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  typeButtonTextActive: {
    color: Colors.textLight,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  currencySymbol: {
    fontSize: FontSizes.xxxl,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginRight: 4,
  },
  amountInput: {
    fontSize: FontSizes.xxxl,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    minWidth: 120,
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',              // Wrap to next line (like flex-wrap in CSS)
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  categoryChipSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  categoryEmoji: { fontSize: 16 },
  categoryLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  categoryLabelSelected: {
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  noteInput: {
    marginHorizontal: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.base,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginBottom: Spacing.xl,
    minHeight: 80,
    textAlignVertical: 'top',     // Android: text starts at top of multiline input
  },
  saveButton: {
    marginHorizontal: Spacing.xl,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: Colors.textLight,
    fontSize: FontSizes.base,
    fontWeight: '700',
  },
});