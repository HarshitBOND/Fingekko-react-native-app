import { ClerkLoaded, ClerkLoading, ClerkProvider, SignedIn, SignedOut } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
// Imported one face at a time, not from the package root: each root index
// re-exports every face the family ships (18 for Plus Jakarta — 9 weights ×
// roman/italic), and Metro would bundle all of them for the handful we use.
// `useFonts` comes from expo-font for the same reason — the copy re-exported by
// @expo-google-fonts is the same hook, but reaching it pulls in that barrel.
import { NotoSerifDisplay_600SemiBold } from '@expo-google-fonts/noto-serif-display/600SemiBold';
import { NotoSerifDisplay_700Bold } from '@expo-google-fonts/noto-serif-display/700Bold';
import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular';
import { PlusJakartaSans_500Medium } from '@expo-google-fonts/plus-jakarta-sans/500Medium';
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans/800ExtraBold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SideMenuProvider } from '../components/navigation/SideMenu';
import LoadingScreen from '../components/ui/LoadingScreen';
import { palette } from '../constants/design';

// Keep the native splash visible until fonts are ready.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
    const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

    const [fontsLoaded, fontError] = useFonts({
        // Prose
        PlusJakartaSans_400Regular,
        PlusJakartaSans_500Medium,
        PlusJakartaSans_600SemiBold,
        PlusJakartaSans_700Bold,
        PlusJakartaSans_800ExtraBold,
        // Streak-calendar day cells only — see `calendarNumericFontFamily` in
        // constants/design. Just the two weights that screen actually renders.
        NotoSerifDisplay_600SemiBold,
        NotoSerifDisplay_700Bold,
    });

    const ready = fontsLoaded || !!fontError; // never block the app on a font failure

    useEffect(() => {
        if (ready) {
            SplashScreen.hideAsync().catch(() => {});
        }
    }, [ready]);

    if (!ready) {
        return (
            <SafeAreaProvider>
                <LoadingScreen />
            </SafeAreaProvider>
        ); // splash stays up until this becomes visible
    }

    if (!publishableKey) {
        return (
            <SafeAreaProvider>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.bg }}>
                    <Text>Missing Clerk publishable key.</Text>
                </View>
            </SafeAreaProvider>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: palette.bg }}>
            <SafeAreaProvider>
                <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
                    <StatusBar style="dark" />
                    <ClerkLoading>
                        <LoadingScreen />
                    </ClerkLoading>

                    <ClerkLoaded>
                        <SignedIn>
                            <SideMenuProvider>
                                <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.bg } }}>
                                    <Stack.Screen name="(tabs)" />
                                </Stack>
                            </SideMenuProvider>
                        </SignedIn>

                        <SignedOut>
                            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.bg } }}>
                                <Stack.Screen name="(auth)" />
                            </Stack>
                        </SignedOut>
                    </ClerkLoaded>
                </ClerkProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}
