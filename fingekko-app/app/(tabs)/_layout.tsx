import { useAuth } from '@clerk/clerk-expo';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, Tabs } from 'expo-router';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../../components/ui/Icon';
import LoadingScreen from '../../components/ui/LoadingScreen';
import { fontFamily, gradients, layout, palette, radius, shadows } from '../../constants/design';

// ─── Custom Tab Bar Icon ─────────────────────────────────────────
type TabIconProps = {
  name: string;
  label: string;
  focused: boolean;
};

function TabIcon({ name, label, focused }: TabIconProps) {
  return (
    <View style={styles.tabIconContainer}>
      <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
        <Icon name={name} size={22} color={focused ? palette.primaryDeep : palette.textTertiary} clickable={false} />
      </View>
      <Text style={[styles.tabLabel, { color: focused ? palette.primaryDeep : palette.textTertiary }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

// ─── Frosted floating background ─────────────────────────────────
function FloatingTabBackground() {
  return (
    <View style={styles.barBackground}>
      <BlurView
        intensity={40}
        tint="light"
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />
      {/* translucent overlay — also the Android fallback when blur is unavailable */}
      <View style={styles.barOverlay} />
    </View>
  );
}

// Hidden + full-screen: keep it out of the bar AND hide the floating bar while
// focused, so bottom-anchored actions (Add expense, Save) aren't covered.
const hiddenScreen = { href: null, tabBarStyle: { display: 'none' as const } };

// ─── Main Tab Layout ─────────────────────────────────────────────
export default function TabLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const insets = useSafeAreaInsets();

  if (!isLoaded) return <LoadingScreen />;
  if (!isSignedIn) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      // 'history' makes the hardware/UI back button return to the *previously
      // visited* screen instead of jumping to the first tab (Home) — the default
      // 'firstRoute' behaviour was why back from a friend/group landed on Home.
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        sceneStyle: { backgroundColor: palette.bg },
        tabBarBackground: () => <FloatingTabBackground />,
        tabBarItemStyle: styles.tabItem,
        tabBarStyle: {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: insets.bottom > 0 ? insets.bottom : layout.navBarBottomInset,
          height: layout.navBarHeight,
          borderRadius: radius.xxl,
          borderTopWidth: 0,
          backgroundColor: 'transparent',
          elevation: 0,
          paddingHorizontal: 6,
          ...shadows.lg,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="Home" label="Home" focused={focused} /> }}
      />

      <Tabs.Screen
        name="insights"
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="BarChart3" label="Insights" focused={focused} /> }}
      />

      {/* CENTER ACTION — raised gradient FAB */}
      <Tabs.Screen
        name="add"
        options={{
          tabBarIcon: () => (
            <View style={styles.fabWrap}>
              <LinearGradient
                colors={gradients.brand}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.fab}
              >
                <Icon name="Plus" size={26} color={palette.white} clickable={false} />
              </LinearGradient>
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="goals"
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="Target" label="Goals" focused={focused} /> }}
      />

      {/* Split replaces the old Profile tab — profile is reachable from the
          avatar and the side menu, so a tab for it was a duplicate. */}
      <Tabs.Screen
        name="YourGroups"
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="Users" label="Split" focused={focused} /> }}
      />

      {/* ─── Hidden routes (navigable, not shown in bar) ───
          Full-screen flows also hide the floating bar itself (hiddenScreen),
          so their bottom-anchored buttons aren't covered by the nav. */}
      {/* Navigation / detail screens keep the bottom nav visible; their content
          is padded to clear it (ScreenContainer / scrollContent handle that). */}
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="quests" options={{ href: null }} />
      <Tabs.Screen name="safe-to-spend" options={{ href: null }} />
      <Tabs.Screen name="Friends" options={{ href: null }} />
      <Tabs.Screen name="NonGroupExpenses" options={{ href: null }} />
      <Tabs.Screen name="Notifications" options={{ href: null }} />
      <Tabs.Screen name="AddExpense" options={{ href: null }} />
      <Tabs.Screen name="GroupExpenses" options={{ href: null }} />
      <Tabs.Screen name="FriendSplits" options={{ href: null }} />
      <Tabs.Screen name="ExpenseDetail" options={{ href: null }} />
      <Tabs.Screen name="group/GroupMembers" options={{ href: null }} />
      <Tabs.Screen name="group/[groupId]" options={{ href: null }} />
      {/* Focused composer flows are full-screen (their own bottom bar), so the
          floating nav is hidden here — matching the reference add-expense UI. */}
      <Tabs.Screen name="AddNewExpense" options={hiddenScreen} />
      <Tabs.Screen name="group/AddNewGroup" options={hiddenScreen} />
      <Tabs.Screen name="group/AddGroupExpense" options={hiddenScreen} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  barBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.xxl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  barOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Platform.select({ ios: 'rgba(255,255,255,0.72)', default: 'rgba(255,255,255,0.94)' }),
  },
  tabItem: {
    height: layout.navBarHeight,
    paddingTop: 0,
    paddingBottom: 0,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    width: 64,
  },
  tabLabel: {
    fontSize: 10.5,
    fontFamily: fontFamily.semibold,
  },
  iconWrapper: {
    width: 46,
    height: 30,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  iconWrapperActive: {
    backgroundColor: palette.primaryLight,
  },
  fabWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
    ...shadows.primary,
  },
});
