import { BarChart3, CalendarDays, ChevronRight, CircleAlert, PiggyBank, Shield, Star, Target, TrendingUp } from 'lucide-react-native';
import { Image, Pressable, Text, View } from 'react-native';
import { Theme } from './constants';
import { styles } from './styles';

type PlannerCardProps = {
  onViewInsights: () => void;
};

export default function PlannerCard({ onViewInsights }: PlannerCardProps) {
  return (
    <View style={styles.plannerCard}>
      <View style={styles.balanceLabelRow}>
        <Text style={{ fontSize: 12, color: Theme.textMuted, fontWeight: '600' }}>Your Financial Personality</Text>
        <CircleAlert size={18} color={Theme.mountainTeal} style={{ marginLeft: 4 }} />
      </View>

      <View style={styles.plannerHeroRow}>
        <View style={styles.plannerLeft}>
          <Text style={styles.plannerTypeName}>The Monk Spender</Text>
          <View style={styles.plannerIconGrid}>
            <View style={styles.plannerIconBox}><CalendarDays size={20} color={Theme.primaryDark} /></View>
            <View style={styles.plannerIconBox}><BarChart3 size={20} color={Theme.mountainTeal} /></View>
            <View style={styles.plannerIconBox}><Target size={20} color={Theme.primary} /></View>
            <View style={styles.plannerIconBox}><Shield size={20} color={Theme.primaryDark} /></View>
          </View>
        </View>

        <View style={styles.plannerImageContainer}>
          <Image
            source={require('../../assets/images/cardImageMonkgekko.png')}
            style={styles.plannerImage}
            resizeMode="contain"
          />
        </View>
      </View>

      <View style={styles.plannerBanner}>
        <View style={styles.plannerBannerIcon}><TrendingUp size={16} color={Theme.primaryDark} /></View>
        <Text style={styles.plannerBannerText}>You plan ahead and make smart money moves.</Text>
      </View>

      <Text style={styles.goodAtLabel}>You are good at:</Text>
      <View style={styles.traitRow}>
        <View style={styles.traitPill}><PiggyBank size={13} color={Theme.primaryDark} /><Text style={styles.traitText}>Budgeting</Text></View>
        <View style={styles.traitPill}><Star size={13} color={Theme.primary} /><Text style={styles.traitText}>Saving</Text></View>
      </View>
      <View style={[styles.traitRow, { marginTop: 6 }]}>
        <View style={styles.traitPill}><Shield size={13} color={Theme.primaryDark} /><Text style={styles.traitText}>Avoiding Debt</Text></View>
      </View>

      <Pressable onPress={onViewInsights} style={styles.plannerBtn}>
        <Text style={styles.plannerBtnText}>View Full Insights</Text>
        <ChevronRight size={16} color={Theme.primaryDark} />
      </Pressable>
    </View>
  );
}