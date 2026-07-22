import React from 'react';
import { RefreshControlProps, ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';
import { layout, palette, spacing } from '@/constants/design';

interface ScreenContainerProps {
  children: React.ReactNode;
  /** Wrap content in a ScrollView (default true). */
  scroll?: boolean;
  /** Apply the standard horizontal screen gutter (default true). */
  gutter?: boolean;
  /** Reserve space at the bottom for the floating tab bar (default true). */
  padForNav?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  edges?: readonly Edge[];
  backgroundColor?: string;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  /** Fixed element rendered above the scroll area (e.g. a header). */
  header?: React.ReactNode;
}

// floating nav clearance = bar height + bottom inset + a little air
const NAV_CLEARANCE = layout.navBarHeight + layout.navBarBottomInset + 28;

// On tablets / large landscape windows, cap the content column and center it so
// the UI reads as a designed layout instead of a phone screen stretched wide.
const CONTENT_MAX_WIDTH = 640;

export default function ScreenContainer({
  children,
  scroll = true,
  gutter = true,
  padForNav = true,
  style,
  contentStyle,
  edges = ['top'],
  backgroundColor = palette.bg,
  refreshControl,
  header,
}: ScreenContainerProps) {
  const pad: ViewStyle = {
    paddingHorizontal: gutter ? layout.gutter : 0,
    paddingBottom: padForNav ? NAV_CLEARANCE : spacing.lg,
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor }, style]} edges={edges}>
      {header}
      {scroll ? (
        <ScrollView
          contentContainerStyle={[pad, contentStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, pad, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
});
