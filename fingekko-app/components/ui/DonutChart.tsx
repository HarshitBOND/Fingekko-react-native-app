import React from 'react';
import { PieChart } from 'react-native-gifted-charts';
import { fontFamily, palette } from '@/constants/design';

export interface DonutSlice {
  value: number;
  color: string;
  /** Optional pre-computed on-slice label (e.g. "42%"). Overrides auto labels. */
  text?: string;
}

export interface DonutChartProps {
  data: DonutSlice[];
  radius?: number;
  /** Inner hole as a fraction of the radius. */
  innerRatio?: number;
  /** Auto-label slices with their % of total, at/above `labelThreshold`. */
  showLabels?: boolean;
  labelThreshold?: number;
  focusedIndex?: number | null;
  onSlicePress?: (index: number) => void;
  centerLabel?: () => React.ReactElement;
  /** Surface color the donut sits on (drives the slice gaps + the hole). */
  surface?: string;
}

/**
 * The single donut style used across the whole app: a segmented donut with
 * gapped slices and optional on-slice percentage labels. Built on
 * react-native-gifted-charts so it renders on device — the shadcn/recharts pie
 * chart is DOM-only and cannot run in React Native, so this is its native twin.
 */
export default function DonutChart({
  data,
  radius = 88,
  innerRatio = 0.62,
  showLabels = true,
  labelThreshold = 8,
  focusedIndex = null,
  onSlicePress,
  centerLabel,
  surface = palette.card,
}: DonutChartProps) {
  const total = data.reduce((sum, s) => sum + s.value, 0);
  const pieData = data.map((s, i) => {
    const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
    const text = s.text ?? (showLabels && pct >= labelThreshold ? `${pct}%` : '');
    return { value: s.value, color: s.color, text, focused: focusedIndex === i };
  });

  return (
    <PieChart
      data={pieData}
      donut
      radius={radius}
      innerRadius={Math.round(radius * innerRatio)}
      innerCircleColor={surface}
      // Gap between slices — the segmented look from the reference (paddingAngle).
      strokeWidth={radius >= 70 ? 3 : 2}
      strokeColor={surface}
      showText
      textColor={palette.white}
      textSize={radius >= 70 ? 12 : 10}
      font={fontFamily.bold}
      onPress={onSlicePress ? (_: unknown, index: number) => onSlicePress(index) : undefined}
      centerLabelComponent={centerLabel}
    />
  );
}
