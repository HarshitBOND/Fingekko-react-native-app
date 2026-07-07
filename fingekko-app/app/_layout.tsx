import { ClerkProvider, SignedIn, SignedOut } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import {
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { palette } from '../constants/design';

// Keep the native splash visible until fonts are ready.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
    const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

    const [fontsLoaded, fontError] = useFonts({
        PlusJakartaSans_400Regular,
        PlusJakartaSans_500Medium,
        PlusJakartaSans_600SemiBold,
        PlusJakartaSans_700Bold,
        PlusJakartaSans_800ExtraBold,
    });

    const ready = fontsLoaded || !!fontError; // never block the app on a font failure

    useEffect(() => {
        if (ready) {
            SplashScreen.hideAsync().catch(() => {});
        }
    }, [ready]);

    if (!ready) {
        return null; // splash stays up
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
                    <SignedIn>
                        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.bg } }}>
                            <Stack.Screen name="(tabs)" />
                        </Stack>
                    </SignedIn>

                    <SignedOut>
                        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.bg } }}>
                            <Stack.Screen name="(auth)" />
                        </Stack>
                    </SignedOut>
                </ClerkProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}
