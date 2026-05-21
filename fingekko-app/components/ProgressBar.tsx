import { LinearGradient } from 'expo-linear-gradient';
import { ColorValue, StyleSheet, View } from 'react-native';

interface ProgressBarProps {
  progress: number;
  height?: number;
  colors?: readonly [ColorValue, ColorValue, ...ColorValue[]];
  trackColor?: string;
  radius?: number;
}

const defaultColors: readonly [ColorValue, ColorValue, ...ColorValue[]] = [
  '#059669',
  '#10b981',
  '#34d399',
  '#10b981',
  '#84d0b1',
];

export default function ProgressBar({
  progress,
  height = 8,
  colors = defaultColors,
  trackColor = '#7788ae30',
  radius = 999,
}: ProgressBarProps) {
  const clampedProgress = Math.min(Math.max(progress, 0), 1);

  return (
    <View style={[styles.track, { height, backgroundColor: trackColor, borderRadius: radius }]}
    >

      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.fill,
          {
            width: `${clampedProgress * 100}%`,
            borderRadius: radius,
          },
        ]}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    overflow: 'hidden',
  },

  fill: {
    height: '100%',
  },
});