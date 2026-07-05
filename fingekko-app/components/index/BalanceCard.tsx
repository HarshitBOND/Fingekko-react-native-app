import Divider from '@/components/Divider';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '../ui/Icon';
import { ImageBackground, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Theme } from './constants';
import { styles } from './styles';

type BalanceCardProps = {
  balanceAmount: number;
  monthlySpend: number;
  monthlyBudget: number;
  daysLeftInMonth: number;
  avgDailySpend: number;
  spendProgress: number;
  remainingProgress: number;
};

export default function BalanceCard({
  balanceAmount,
  monthlySpend,
  monthlyBudget,
  daysLeftInMonth,
  avgDailySpend,
  spendProgress,
  remainingProgress,
}: BalanceCardProps) {
  const { width } = useWindowDimensions();
  const scale = Math.min(1, width / 420);
  const ringSize = Math.max(56, Math.round(72 * scale));
  const ringStroke = Math.max(4, Math.round(6 * scale));
  const ringRadius = (ringSize - ringStroke) / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - spendProgress);

  return (
    <View style={styles.balanceCard}>
      <ImageBackground
        source={require('../../assets/images/bgHomePage.png')}
        resizeMode="cover"
        style={styles.balanceBackgroundImage}
        imageStyle={styles.balanceBackgroundImageStyle}
      >
        <LinearGradient
          colors={['rgba(203,232,231,0.12)', 'rgba(91,168,155,0.34)', 'rgba(23,53,43,0.88)']}
          locations={[0, 0.58, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.balanceFadeOverlay}
        />
        <View style={styles.balanceContent}>
          <View style={styles.balanceMainSection}>
            <View style={styles.balanceLabelRow}>
              <Text style={styles.balanceLabel} numberOfLines={1}>Remaining Balance</Text>
              <Icon name="Eye" style={styles.balanceEye} size={16} color={Theme.textMain} />
            </View>
            <View style={styles.balanceValueRow}>
              <Text style={styles.balanceValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                ₹{Math.round(balanceAmount).toLocaleString('en-IN')}
              </Text>
              <View style={styles.healthBadge}>
                <Text style={styles.healthBadgeText}>{spendProgress < 0.5 ? 'Healthy' : 'Watch'}</Text>
              </View>
            </View>
          </View>

          <Divider orientation="horizontal" thickness={3} color="#000000" inset={0} style={{ marginVertical: 12 }} />

          <View style={styles.balanceDetailsRow}>
            <View style={styles.spendInfo}>
              <Text style={styles.spendLabel}>This Month&apos;s Spend</Text>
              <Text style={styles.spendValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                ₹{Math.round(monthlySpend).toLocaleString('en-IN')}
              </Text>
              <Text style={styles.spendSubLabel}>of ₹{Math.round(monthlyBudget).toLocaleString('en-IN')} budget</Text>
            </View>
            <View style={styles.circularChart}>
              <Svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`}>
                <Circle cx={ringSize / 2} cy={ringSize / 2} r={ringRadius} stroke="rgba(249,255,250,0.18)" strokeWidth={ringStroke} fill="none" />
                <Circle
                  cx={ringSize / 2}
                  cy={ringSize / 2}
                  r={ringRadius}
                  stroke={Theme.primaryLight}
                  strokeWidth={ringStroke}
                  fill="none"
                  strokeDasharray={[ringCircumference]}
                  strokeDashoffset={ringOffset}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
                />
              </Svg>
              <View style={styles.circularText}>
                <Text style={styles.circularValue}>{Math.round(spendProgress * 100)}%</Text>
                <Text style={styles.circularLabel}>used</Text>
              </View>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <LinearGradient
              colors={[Theme.primary, Theme.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${remainingProgress * 100}%` }]}
            />
          </View>

          <View style={styles.balanceBottomDivider} />

          <View style={styles.bottomRow}>
            <View style={styles.bottomItems}>
              <View style={styles.bottomItem}>
                <View style={styles.bottomIconWrap}><Icon name="CalendarDays" size={18} color="#000000" /></View>
                <View style={styles.bottomText}>
                  <Text style={styles.bottomValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{daysLeftInMonth}</Text>
                  <Text style={styles.bottomLabel} numberOfLines={1}>Days left in month</Text>
                </View>
              </View>
              <View style={styles.bottomItemDivider} />
              <View style={styles.bottomItem}>
                <View style={styles.bottomIconWrap}><Icon name="Wallet" size={18} color="#000000" /></View>
                <View style={styles.bottomText}>
                  <Text style={styles.bottomValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>₹{Math.round(avgDailySpend).toLocaleString('en-IN')}</Text>
                  <Text style={styles.bottomLabel}>Avg. daily spend</Text>
                </View>
              </View>
            </View>
            <Icon name="ChevronRight" size={18} color="#000000" />
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}