import { useAuth } from '@clerk/clerk-expo';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiRequest } from '../../utils/api';
import Icon from '../../components/ui/Icon';

type BackendExpenseItem = {
  id: string;
  groupId: string | null;
  description: string;
  amount: number;
  netBalance: number;
  participants: { userId: { name: string } }[];
  category?: string;
};

export default function NonGroupExpenses() {
  const router = useRouter();
  const { getToken } = useAuth();
  const [expenses, setExpenses] = useState<BackendExpenseItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      
      const response = await apiRequest<{ expenses: BackendExpenseItem[] }>({
        method: 'get',
        url: '/api/expenses',
        token,
      });
      
      // Filter out expenses that are part of a group
      const nonGroup = (response?.expenses || []).filter((e) => !e.groupId);
      setExpenses(nonGroup);
    } catch (error) {
      console.error('Error fetching non-group expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getAmountColor = (balance: number) => {
    if (balance > 0) return '#148a46';
    if (balance < 0) return '#eb5a4f';
    return '#6b7280';
  };

  const getAmountLabel = (balance: number) => {
    if (balance > 0) return 'You are owed';
    if (balance < 0) return 'You owe';
    return 'You are settled up';
  };

  return (
    <SafeAreaView style={styles.page} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        <View style={styles.heroSection}>
          <LinearGradient
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            colors={['rgba(20,138,70,0.18)', 'rgba(20,138,70,0.05)', 'transparent']}
            locations={[0, 0.35, 1]}
            style={[
              StyleSheet.absoluteFill,
              {
                width: 240,
                height: 240,
                top: -70,
                left: -70,
                borderRadius: 200,
              },
            ]}
          />

          <View style={styles.topBar}>
            <View style={styles.brandRow}>
              <View style={styles.logoCircle}>
                <Icon name="ArrowDownLeft" size={18} color="#148a46" />
              </View>
              <Text style={styles.brandTitle}>Non Group Expenses</Text>
            </View>
            <Pressable style={styles.menuButton} onPress={() => router.back()}>
              <Icon name="Menu" size={20} color="#1f2937" />
            </Pressable>
          </View>

          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Personal splits</Text>
            <Text style={styles.heroSubtitle}>A simple view of expenses outside groups.</Text>
          </View>
        </View>

        <View style={styles.card}>
          {loading ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <ActivityIndicator color="#148a46" />
            </View>
          ) : expenses.length === 0 ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={{ fontSize: 14, color: '#6b7280', fontWeight: '700' }}>You have no non-group expenses.</Text>
            </View>
          ) : (
            expenses.map((item, index) => {
              const balance = item.netBalance;
              const participantNames = item.participants
                .map((p) => p.userId?.name)
                .filter(Boolean)
                .join(', ') || 'Self';

              return (
                <View
                  key={item.id}
                  style={[styles.groupRow, index !== expenses.length - 1 && styles.divider]}
                >
                  <View style={styles.groupIconWrap}>
                    <Text style={styles.groupIconEmoji}>💵</Text>
                  </View>
                  <View style={styles.groupTextWrap}>
                    <Text style={styles.groupName}>{item.description}</Text>
                    <Text style={styles.groupMembers}>{participantNames}</Text>
                  </View>
                  <View style={styles.groupRight}>
                    <Text style={styles.groupStatusLabel}>{getAmountLabel(balance)}</Text>
                    <Text style={[styles.groupAmount, { color: getAmountColor(balance) }]}>₹{Math.abs(balance).toFixed(2)}</Text>
                  </View>
                  <Icon name="ChevronRight" size={16} color="#9ca3af" style={styles.groupChevron} />
                </View>
              );
            })
          )}
        </View>

        <View style={styles.footerBanner}>
          <ImageBackground
            source={require('../../assets/images/bgadd.png')}
            style={styles.footerBannerBg}
            resizeMode="cover"
            imageStyle={styles.footerBannerBgImage}
          >
            <View style={styles.footerBannerOverlay} />
            <View style={styles.footerBannerContent}>
              <Text style={styles.footerBannerTitle}>Keep it simple.</Text>
              <Text style={styles.footerBannerTitle}>Keep it fair.</Text>
            </View>
          </ImageBackground>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#FFF8E7',
  },
  container: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 16,
  },
  heroSection: {
    width: '100%',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoCircle: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000000',
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  heroCopy: {
    paddingTop: 24,
    gap: 4,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: -0.8,
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#000000',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 16,
    borderWidth: 3,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  divider: {
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    gap: 12,
  },
  groupIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#C3FFD8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  groupIconEmoji: {
    fontSize: 18,
  },
  groupTextWrap: {
    flex: 1,
    gap: 2,
  },
  groupName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000000',
  },
  groupMembers: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333333',
  },
  groupRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  groupStatusLabel: {
    fontSize: 11,
    color: '#333333',
    fontWeight: '700',
  },
  groupAmount: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  groupChevron: {
    marginLeft: 4,
  },
  footerBanner: {
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#000000',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  footerBannerBg: {
    minHeight: 130,
    justifyContent: 'flex-end',
  },
  footerBannerBgImage: {
    borderRadius: 5,
  },
  footerBannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 222, 67, 0.45)',
    borderRadius: 5,
  },
  footerBannerContent: {
    padding: 20,
    paddingBottom: 18,
  },
  footerBannerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: -0.3,
    lineHeight: 28,
  },
});