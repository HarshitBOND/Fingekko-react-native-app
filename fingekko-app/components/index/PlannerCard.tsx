import Button from '../ui/Button';
import Icon from '../ui/Icon';
import { Image, Text, View } from 'react-native';
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
        <Icon name="CircleAlert" size={18} color={Theme.mountainTeal} style={{ marginLeft: 4 }} />
      </View>

      <View style={styles.plannerHeroRow}>
        <View style={styles.plannerLeft}>
          <Text style={styles.plannerTypeName}>The Monk Spender</Text>
          <View style={styles.plannerIconGrid}>
            <View style={styles.plannerIconBox}><Icon name="CalendarDays" size={20} color={Theme.primaryDark} /></View>
            <View style={styles.plannerIconBox}><Icon name="BarChart3" size={20} color={Theme.mountainTeal} /></View>
            <View style={styles.plannerIconBox}><Icon name="Target" size={20} color={Theme.primary} /></View>
            <View style={styles.plannerIconBox}><Icon name="Shield" size={20} color={Theme.primaryDark} /></View>
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
        <View style={styles.plannerBannerIcon}><Icon name="TrendingUp" size={16} color={Theme.primaryDark} /></View>
        <Text style={styles.plannerBannerText}>You plan ahead and make smart money moves.</Text>
      </View>

      <Text style={styles.goodAtLabel}>You are good at:</Text>
      <View style={styles.traitRow}>
        <View style={styles.traitPill}><Icon name="PiggyBank" size={13} color={Theme.primaryDark} /><Text style={styles.traitText}>Budgeting</Text></View>
        <View style={styles.traitPill}><Icon name="Star" size={13} color={Theme.primary} /><Text style={styles.traitText}>Saving</Text></View>
      </View>
      <View style={[styles.traitRow, { marginTop: 6 }]}>
        <View style={styles.traitPill}><Icon name="Shield" size={13} color={Theme.primaryDark} /><Text style={styles.traitText}>Avoiding Debt</Text></View>
      </View>

      <Button
        variant="primary"
        size="md"
        onPress={onViewInsights}
        style={{ marginTop: 12 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ color: '#000000', fontWeight: '800', fontSize: 14 }}>View Full Insights</Text>
          <Icon name="ChevronRight" size={16} color={Theme.primaryDark} />
        </View>
      </Button>
    </View>
  );
}