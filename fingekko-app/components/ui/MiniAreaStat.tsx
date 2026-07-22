import { StyleSheet, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { palette, radius, shadows, spacing } from '@/constants/design';
import AppText from './AppText';
import Icon from './Icon';

export interface MiniAreaStatProps {
  /** Lucide icon name (rendered static). */
  icon: string;
  title: string;
  value: string;
  period?: string;
  /** Sparkline points, oldest → newest. */
  data: { value: number }[];
  /** Accent color for the icon, line, and area fill. */
  color: string;
  /** Sparkline width in px. */
  chartWidth?: number;
}

/**
 * A compact KPI card with a mini area (sparkline) chart — the React Native
 * equivalent of the web "area chart" cards, built on react-native-gifted-charts
 * so it runs on device (recharts is DOM-only and cannot render here).
 */
export default function MiniAreaStat({
  icon,
  title,
  value,
  period,
  data,
  color,
  chartWidth = 116,
}: MiniAreaStatProps) {
  // gifted-charts needs at least two points; fall back to a flat baseline.
  const points = data.length > 1 ? data : [{ value: 0 }, { value: 0 }];
  const peak = Math.max(1, ...points.map((p) => p.value));
  const height = 52;
  const spacingPx = points.length > 1 ? chartWidth / (points.length - 1) : chartWidth;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Icon name={icon} size={18} color={color} clickable={false} />
        <AppText variant="label" weight="semibold" color="textPrimary">{title}</AppText>
      </View>

      <View style={styles.bodyRow}>
        <View style={styles.info}>
          {period ? (
            <AppText variant="caption" color="textTertiary" numberOfLines={1}>{period}</AppText>
          ) : null}
          <AppText variant="money" weight="bold" numberOfLines={1} adjustsFontSizeToFit style={styles.value}>
            {value}
          </AppText>
        </View>

        <View style={{ width: chartWidth, height }}>
          <LineChart
            data={points}
            width={chartWidth}
            height={height}
            spacing={spacingPx}
            initialSpacing={0}
            endSpacing={0}
            maxValue={peak * 1.15}
            color={color}
            thickness={2}
            curved
            areaChart
            startFillColor={color}
            endFillColor={color}
            startOpacity={0.28}
            endOpacity={0.02}
            hideDataPoints
            hideRules
            hideYAxisText
            yAxisThickness={0}
            xAxisThickness={0}
            yAxisColor="transparent"
            xAxisColor="transparent"
            disableScroll
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: 14,
    ...shadows.md,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bodyRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.md },
  info: { flex: 1, gap: 2 },
  value: { fontSize: 26, letterSpacing: -0.4 },
});
