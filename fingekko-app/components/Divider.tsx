import { DimensionValue, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  thickness?: number;
  color?: string;
  length?: DimensionValue;
  inset?: number;
  style?: StyleProp<ViewStyle>;
}

export default function Divider({
  orientation = 'horizontal',
  thickness = 1,
  color = 'rgba(0,0,0,0.12)',
  length,
  inset = 0,
  style,
}: DividerProps) {
  const dimensionStyle: ViewStyle =
    orientation === 'vertical'
      ? { width: thickness, marginHorizontal: inset }
      : { height: thickness, marginVertical: inset };

  if (length !== undefined) {
    if (orientation === 'vertical') {
      dimensionStyle.height = length;
    } else {
      dimensionStyle.width = length;
    }
  }

  return (
    <View style={[styles.base, { backgroundColor: color }, dimensionStyle, style]} />
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'stretch',
  },
});
