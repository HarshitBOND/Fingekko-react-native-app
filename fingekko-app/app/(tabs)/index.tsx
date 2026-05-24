import TodaysProgress from '@/components/TodaysProgress';
import type { HomeResponse } from '@/types';
import { apiRequest } from '@/utils/api';
import { useAuth } from '@clerk/clerk-expo';
import { LinearGradient } from 'expo-linear-gradient';
import { BarChart3, CalendarDays, ChevronRight, CircleAlert, Eye, Flame, Target, Wallet, Zap } from 'lucide-react-native';
import { useEffect, useMemo, useState, useWindowDimensions } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import Divider from '../../components/Divider';
import Navbar from '../../components/Navbar';
import { Colors, FontSizes } from '../../constants/Colors';


export default function TabIndex(){
  const spendProgress = 0.43;
  const remainingProgress = 1 - spendProgress;
  const { width } = useWindowDimensions();
  const scale = Math.min(1, width / 420);
  const ringSize = Math.max(56, Math.round(72 * scale));
  const ringStroke = Math.max(4, Math.round(6 * scale));
  const ringRadius = (ringSize - ringStroke) / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - spendProgress);
  const { getToken, isSignedIn } = useAuth();
  const [homeData, setHomeData] = useState<HomeResponse | null>(null);

  useEffect(() => {
    let isActive = true;

    const loadHome = async () => {
      if (!isSignedIn) {
        setHomeData(null);
        return;
      }

      try {
        const token = await getToken();
        if (!token) {
          return;
        }
        const response = await apiRequest<HomeResponse>('/api/home', {}, token);
        if (isActive) {
          setHomeData(response);
        }
      } catch (error) {
        console.warn('Failed to load home data:', error);
      }
    };

    loadHome();

    return () => {
      isActive = false;
    };
  }, [getToken, isSignedIn]);

  const stats = homeData?.stats ?? null;

  const progressItems = useMemo(() => {
      if (!stats) {
        return undefined;
      }
  
      return [
        {
          icon: Flame,
          value: String(stats.dayStreak),
          label: 'Day Streak',
          color: '#16a34a',
        },
        {
          icon: Zap,
          value: String(stats.totalXp),
          label: 'Total XP',
          color: '#f59e0b',
        },
        {
          icon: Target,
          value: `${stats.questsDone} / ${stats.questsTarget}`,
          label: 'Quests Done',
          color: '#10b981',
        },
        {
          icon: BarChart3,
          value: `${stats.betterThanYesterday}%`,
          label: 'Better than\nyesterday',
          color: '#8b5cf6',
        },
      ];
    }, [stats]);

  return (
    <SafeAreaView style={{flex:1}}>
      <ScrollView contentContainerStyle={styles.containerCard}>
        <Navbar />

        <View style={styles.greetingPlaceholder}>
            <View style={{flexDirection:'column', flex: 1}}>
              <Text style={{fontSize: FontSizes.sm, color: '#6b7280', marginBottom: 4, fontWeight: '500'}}>Good Morning, Arjun! 👋</Text>
              <Text style={{fontSize: FontSizes.xl, fontWeight: '800', color: '#111827', marginTop: 2}}>Let's make today</Text>
              <Text style={{fontSize: FontSizes.xl, color: '#4b5563', fontWeight: '500'}}>
                a <Text style={{color: '#2d884d', fontWeight: '800'}}>smart money</Text> day
              </Text>
            </View>
            <View style={styles.datePill}>
              <CalendarDays style={{ marginHorizontal: 2}} size={12} strokeWidth={1.5} />
              <Text style={{color: '#4b5563', fontSize: 12}}>19 May, 2024</Text>
            </View>
        </View>

        <LinearGradient
          colors={['#095542', '#05282d']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCardPlaceholder}
        >
          <View style={styles.balanceTopRow}>
            <View style={styles.balanceTopLeft}>
              <View style={styles.balanceLabelRow}>
                <Text style={styles.balanceLabel}>Remaining Balance</Text>
                <Eye style={styles.balanceEye} size={16} color="rgba(255,255,255,0.9)" />
              </View>
              <Text style={styles.balanceValue}>₹12,450</Text>
              <View style={styles.healthBadge}>
                <Text style={styles.healthBadgeText}>Healthy</Text>
              </View>
            </View>

            <Divider
              orientation="vertical"
              thickness={1}
              color="rgba(255, 255, 255, 0.19)"
              inset={8}
            />

            <View style={styles.balanceTopRight}>
              <View style={styles.spendInfo}>
                <Text style={styles.spendLabel}>This Month's Spend</Text>
                <Text style={styles.spendValue}>₹8,560</Text>
                <Text style={styles.spendSubLabel}>of ₹20,000 budget</Text>
              </View>

              <View style={styles.circularChart}>
                <Svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`}>
                  <Circle
                    cx={ringSize / 2}
                    cy={ringSize / 2}
                    r={ringRadius}
                    stroke="rgba(255,255,255,0.18)"
                    strokeWidth={ringStroke}
                    fill="none"
                  />
                  <Circle
                    cx={ringSize / 2}
                    cy={ringSize / 2}
                    r={ringRadius}
                    stroke="#9AD84D"
                    strokeWidth={ringStroke}
                    fill="none"
                    strokeDasharray={[ringCircumference]}
                    strokeDashoffset={ringOffset}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
                  />
                </Svg>
                <View style={styles.circularText}>
                  <Text style={styles.circularValue}>43%</Text>
                  <Text style={styles.circularLabel}>used</Text>
                </View>
              </View>
            </View>
          </View>



          <View style={styles.progressTrack}>
            <LinearGradient
              colors={['#9AD84D', '#76C93A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${remainingProgress * 100}%` }]}
            />
          </View>

          <View style={styles.balanceBottomDivider} />

          <View style={styles.bottomRow}>
            <View style={styles.bottomItems}>
              <View style={styles.bottomItem}>
                <View style={styles.bottomIconWrap}>
                  <CalendarDays size={18} color="#ffffff" />
                </View>
                <View style={styles.bottomText}>
                  <Text style={styles.bottomValue}>11</Text>
                  <Text style={styles.bottomLabel}>Days left in this month</Text>
                </View>
              </View>
              <View style={styles.bottomItemDivider} />
              <View style={styles.bottomItem}>
                <View style={styles.bottomIconWrap}>
                  <Wallet size={18} color="#ffffff" />
                </View>
                <View style={styles.bottomText}>
                  <Text style={styles.bottomValue}>₹1,120</Text>
                  <Text style={styles.bottomLabel}>Avg. daily spend</Text>
                </View>
              </View>
            </View>
            <ChevronRight size={18} color="rgba(255,255,255,0.6)" />
          </View>
        </LinearGradient>

        <TodaysProgress items={progressItems} />

        <View style={styles.insightGrid}>
          <View style={[styles.PlannerPlaceholder, { width: width < 420 ? '100%' : '48%' }]}> 
              <View style={styles.balanceLabelRow}>
                <Text style={{fontSize: FontSizes.sm}}>Your Financial Personality</Text>
                <CircleAlert size={18} color="#374151ef" style={{marginLeft: 4}} />
              </View>
              <View style={styles.plannerImageContainer}>
                <Image
                  source={require('../../assets/images/personalityThePlanner.png')}
                  style={styles.plannerImage}
                  resizeMode="contain"
                />
              </View>
              <View>
                <Text style={{fontSize: FontSizes.sm, color:'#2f3845'}}>
                  You are good at:
                </Text>
                
              </View>
          </View>

            <View style={[styles.streakPlaceholder, { width: width < 420 ? '100%' : '48%' }]}>
              <Text>Streak</Text>
            </View>
        </View>

        <View style={styles.SuggestionsPlaceholder}>

        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

const styles= StyleSheet.create({

  greetingPlaceholder: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#f3f4f6', 
    borderRadius: 24,
    padding: 10,
  },

  balanceCardPlaceholder:{
    backgroundColor: '#0B6E4F',
    borderRadius: 18,
    marginHorizontal: 5,
    paddingHorizontal: 20,
    paddingTop: 25,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6},
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },

  balanceTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    
  },

  balanceTopLeft: {
    flex: 1,
  },

  balanceTopRight: {
    flex: 1.5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  balanceLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    width: '100%',
  },

  balanceEye: {
    marginLeft: 'auto',
  },

  balanceLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: FontSizes.sm,
    fontWeight: '500',
  },

  balanceValue: {
    color: Colors.textLight,
    fontSize: 30,
    fontWeight: '700',
  },

  healthBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#0F6B3A',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },

  healthBadgeText: {
    color: '#DFF7C9',
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },

  spendInfo: {
    flex: 1,
    paddingRight: 8,
  },

  spendLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: FontSizes.sm,
    fontWeight: '500',
  },

  spendValue: {
    color: Colors.textLight,
    fontSize: 24,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },

  spendSubLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: FontSizes.xs,
    marginTop: 4,
  },

  PlannerPlaceholder:{
    minHeight: 220,
    flex:1,
    backgroundColor: '#ffffff93',
    borderRadius: 24,
    padding: 18,
  },

  plannerImageContainer: {
    alignItems: 'center',
  },

  plannerImage: {
    width: '100%',
    height: undefined,
    aspectRatio: 1.8,
    borderRadius: 12,
  },

  streakPlaceholder:{
    minHeight: 220,
    flex:1,
    backgroundColor: '#ffffff93',
    borderRadius: 24,
    padding: 18,
  },

  containerCard:{
    paddingHorizontal:10,
    paddingBottom: 10,
  },

  SuggestionsPlaceholder:{
    height: 80,
    backgroundColor: '#8be1f1',
    borderRadius: 20,
    marginTop: 20,
  },

  datePill:{
    flexDirection:'row', 
    alignItems:'center',
    justifyContent:'center',
    borderWidth: 1,
    borderColor: '#e6e9ed',
    borderRadius:999, 
    paddingVertical: 8,
    paddingHorizontal: 12, 
    backgroundColor: 'transparent',
    gap:4,
  },

  circularChart:{
    width: 72,
    height: 72,
    alignItems:'center',
    justifyContent:'center',
  },

  circularText: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },

  circularValue: {
    color: Colors.textLight,
    fontSize: 16,
    fontWeight: '700',
  },

  circularLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: FontSizes.xs,
  },

  progressTrack:{
    width: '100%',
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    marginTop: 16,
  },

  progressFill:{
    height: '100%',
    borderRadius: 999,
  },

  balanceBottomDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginVertical: 14,
  },

  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  bottomItems: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  bottomItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  bottomItemDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginHorizontal: 12,
  },

  bottomIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },

  bottomText: {
    flex: 1,
  },

  bottomValue: {
    color: '#9AD84D',
    fontSize: 18,
    fontWeight: '700',
  },

  bottomLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: FontSizes.xs,
    lineHeight: 16,
    marginTop: 2,
  },

  insightGrid:{
    flexDirection:'row',
    gap:8,
    marginTop: 10,
  },

})