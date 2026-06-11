import { useAuth } from '@clerk/clerk-expo';
import { Redirect, Tabs, usePathname } from 'expo-router';
import { BarChart, Home, Plus, Target, User } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';




// ─── Custom Tab Bar Icon Component ───────────────────────────────

type TabIconProps = {
  icon: React.ElementType; // Icon component from lucide-react-native
  label: string;           // Tab label text
  focused: boolean;        // Is this tab currently active?
  activeColor: string;
};

function TabIcon({ icon: Icon, label, focused, activeColor }: TabIconProps) {
  return (
    <View style={styles.tabIconContainer}>
      <Icon size={20} color={focused ? activeColor : Colors.tabBarInactive} />
      <Text style={[
        styles.tabLabel,
        { color: focused ? Colors.tabBarActive : Colors.tabBarInactive , textAlign: 'center'}
      ]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

// ─── Main Tab Layout ─────────────────────────────────────────────
export default function TabLayout() {

  const { isLoaded, isSignedIn } = useAuth();

  //if loading the page
  if(!isLoaded){
    return null;
  }
  // If not signed in, redirect to auth flow
  if (!isSignedIn) {
    return <Redirect href="/(auth)/login" />;
  }

  const insets = useSafeAreaInsets();

  const pathname = usePathname();

  const activeColor =
  pathname.startsWith('/insights')
    ? '#5aabf6' // blue
    : pathname.startsWith('/goals')
    ? '#F97316' // orange
    : pathname.startsWith('/profile')
    ? '#A855F7' // purple
    : pathname.startsWith('/add')
    ? '#10B981' // emerald
    : '#22C55E'; // default green

  return (
    <Tabs
      screenOptions={{
        headerShown: false,      // Hide the top header bar
        tabBarStyle: {
          ...styles.tabBar,
          paddingBottom: insets.bottom + 8, // Add safe area inset to padding
        },
        tabBarShowLabel: false,  // We handle labels in our custom icon
      }}
    >
      {/* Each Tabs.Screen = one tab in the bottom bar */}

      <Tabs.Screen
        name="index"             // matches app/(tabs)/index.tsx
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={Home} label="Home" focused={focused} activeColor={activeColor} />
          ),
        }}
      />

      <Tabs.Screen
        name="insights"          // matches app/(tabs)/insights.tsx
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={BarChart} label="Insights" focused={focused} activeColor={activeColor} />
          ),
        }}
      />

      {/* CENTER ADD BUTTON — special tab, bigger and green */}
      <Tabs.Screen
        name="add"
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={[styles.addButton,
              { backgroundColor: activeColor , shadowColor: activeColor} // Slightly transparent when not focused
            ]}>
              <Plus size={24} color={Colors.textLight} />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="goals"             // matches app/(tabs)/goals.tsx
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={Target} label="Goals" focused={focused} activeColor={activeColor} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"           // matches app/(tabs)/profile.tsx
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={User} label="Profile" focused={focused} activeColor={activeColor} />
          ),
        }}
      />

      <Tabs.Screen
        name="safe-to-spend"     // matches app/(tabs)/safe-to-spend.tsx
        options={{
          href: null,
        }}
      />

    </Tabs>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
// StyleSheet.create() is React Native's way of writing CSS
// Note: no hyphens! (background-color → backgroundColor)

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.tabBar,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    height: 70,              // Taller than default for better touch area
    paddingBottom: 8,
    paddingTop: 8,
    // Shadow (iOS)
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    // Shadow (Android)
    elevation: 10,
  },
  tabIconContainer: {
    alignItems: 'center',    // center horizontally (like align-items in CSS)
    justifyContent: 'center',
    gap: 2,
  },
  tabEmoji: {
    fontSize: 20,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  // The big green + button in the center
  addButton: {
    backgroundColor: Colors.primary,
    width: 52,
    height: 52,
    borderRadius: 26,        // Half of width/height = perfect circle
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,        // Lifts it above the tab bar
    // Shadow
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  addButtonText: {
    color: Colors.textLight,
    fontSize: 28,
    fontWeight: '300',
    marginTop: -2,           // Fine-tune vertical centering
  },
});