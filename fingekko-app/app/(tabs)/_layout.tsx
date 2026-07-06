import { useAuth } from '@clerk/clerk-expo';
import { Redirect, Tabs, usePathname } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../../components/ui/Icon';
import { Colors } from '../../constants/Colors';

// ─── Custom Tab Bar Icon Component ───────────────────────────────

type TabIconProps = {
  name: string;            // Icon name key
  label: string;           // Tab label text
  focused: boolean;        // Is this tab currently active?
  activeColor: string;
};

function TabIcon({ name, label, focused, activeColor }: TabIconProps) {
  return (
    <View style={styles.tabIconContainer}>
      <View style={[
        styles.iconWrapper,
        focused && styles.iconWrapperActive
      ]}>
        <Icon name={name} size={18} color={focused ? '#000000' : Colors.tabBarInactive} clickable={true} />
      </View>
      <Text style={[
        styles.tabLabel,
        {
          color: focused ? Colors.tabBarActive : Colors.tabBarInactive,
          textAlign: 'center',
          fontWeight: focused ? '800' : '600'
        }
      ]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

// ─── Main Tab Layout ─────────────────────────────────────────────
export default function TabLayout() {

  const { isLoaded, isSignedIn } = useAuth();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  //if loading the page
  if(!isLoaded){
    return null;
  }
  // If not signed in, redirect to auth flow
  if (!isSignedIn) {
    return <Redirect href="/(auth)/login" />;
  }

  const activeColor = '#10B981'; // default green

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
            <TabIcon name="Home" label="Home" focused={focused} activeColor={activeColor} />
          ),
        }}
      />

      <Tabs.Screen
        name="insights"          // matches app/(tabs)/insights.tsx
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="BarChart" label="Insights" focused={focused} activeColor={activeColor} />
          ),
        }}
      />

      {/* CENTER ADD BUTTON — special tab, bigger and green */}
      <Tabs.Screen
        name="add"
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={styles.addButton}>
              <Icon name="Repeat" size={24} color="#000000" clickable={true} />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="goals"             // matches app/(tabs)/goals.tsx
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="Target" label="Goals" focused={focused} activeColor={activeColor} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"           // matches app/(tabs)/profile.tsx
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="User" label="Profile" focused={focused} activeColor={activeColor} />
          ),
        }}
      />

      <Tabs.Screen
        name="safe-to-spend"     // matches app/(tabs)/safe-to-spend.tsx
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="AddNewExpense"     // matches app/(tabs)/AddNewExpense.tsx
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="YourGroups"     // matches app/(tabs)/YourGroups.tsx
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="Friends"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="NonGroupExpenses"     // matches app/(tabs)/NonGroupExpenses.tsx
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="GroupExpenses"     // matches app/(tabs)/GroupExpenses.tsx
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="Notifications"     // matches app/(tabs)/Notifications.tsx
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="FriendSplits"     // matches app/(tabs)/FriendSplits.tsx
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="group/[groupId]"     // matches app/(tabs)/groupId.tsx
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="AddExpense"     // matches app/(tabs)/AddExpense.tsx
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="group/AddNewGroup"     // matches app/(tabs)/AddNewGroup.tsx
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="group/AddGroupExpense"     // matches app/(tabs)/AddGroupExpense.tsx
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
    borderTopWidth: 2,
    borderTopColor: '#000000',
    height: 72,              // Taller than default for better touch area
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabIconContainer: {
    alignItems: 'center',    // center horizontally (like align-items in CSS)
    justifyContent: 'center',
    gap: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  iconWrapper: {
    width: 42,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    marginBottom: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconWrapperActive: {
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
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
    borderWidth: 2,
    borderColor: '#000000',
    // Shadow
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
});