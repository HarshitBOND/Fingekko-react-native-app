import { useAuth, useUser } from '@clerk/clerk-expo';
import { router } from 'expo-router';
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Dimensions, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fontFamily, motion, palette, radius, shadows, spacing } from '../../constants/design';
import AppText from '../ui/AppText';
import Icon from '../ui/Icon';
import UserAvatar from '../ui/UserAvatar';
import { MENU_SECTIONS, type MenuItem } from './menu-items';

const SCREEN_WIDTH = Dimensions.get('window').width;
const PANEL_WIDTH = Math.min(320, SCREEN_WIDTH * 0.86);

// Built once on the JS thread — the gesture worklet reads it rather than
// constructing a bezier on every release.
const EASING = Easing.bezier(...motion.easing);
const OPEN_CONFIG = { duration: motion.base, easing: EASING };
const CLOSE_CONFIG = { duration: motion.fast, easing: EASING };

/* ────────────────────────────────────────────────────────────────────────────
 * Context — any screen can open the menu without prop drilling.
 * ──────────────────────────────────────────────────────────────────────────── */
type SideMenuApi = { open: () => void; close: () => void };

const SideMenuContext = createContext<SideMenuApi>({ open: () => {}, close: () => {} });

export const useSideMenu = () => useContext(SideMenuContext);

/* ────────────────────────────────────────────────────────────────────────────
 * Row
 * ──────────────────────────────────────────────────────────────────────────── */
function MenuRow({ item, onNavigate }: { item: MenuItem; onNavigate: (href: string) => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => onNavigate(item.href)}
    >
      <View style={styles.rowIcon}>
        <Icon name={item.icon} size={19} color={palette.primaryDeep} clickable={false} />
      </View>
      <View style={styles.rowText}>
        <AppText variant="label">{item.label}</AppText>
        {!!item.hint && (
          <AppText variant="micro" color="textTertiary" numberOfLines={1}>
            {item.hint}
          </AppText>
        )}
      </View>
      <Icon name="ChevronRight" size={16} color={palette.textTertiary} clickable={false} />
    </Pressable>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Provider — owns the animation and renders the overlay above its children.
 * ──────────────────────────────────────────────────────────────────────────── */
export function SideMenuProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const { signOut } = useAuth();

  // `mounted` keeps the overlay out of the tree while closed, so it can never
  // swallow touches meant for the screen underneath.
  const [mounted, setMounted] = useState(false);
  const progress = useSharedValue(0);
  // Pan start offset, in the same 0..1 space as `progress`.
  const panStart = useSharedValue(0);

  const open = useCallback(() => {
    setMounted(true);
    progress.value = withTiming(1, OPEN_CONFIG);
  }, [progress]);

  const close = useCallback(() => {
    progress.value = withTiming(0, CLOSE_CONFIG, (finished) => {
      if (finished) runOnJS(setMounted)(false);
    });
  }, [progress]);

  const api = useMemo<SideMenuApi>(() => ({ open, close }), [open, close]);

  // Navigate only after the panel is out of the way — pushing mid-animation
  // makes the transition stutter on Android.
  const pendingHref = useRef<string | null>(null);
  const flushNavigation = useCallback(() => {
    const href = pendingHref.current;
    pendingHref.current = null;
    if (href) router.push(href as never);
  }, []);

  const handleNavigate = useCallback(
    (href: string) => {
      pendingHref.current = href;
      close();
      setTimeout(flushNavigation, motion.fast);
    },
    [close, flushNavigation],
  );

  const handleSignOut = useCallback(() => {
    close();
    setTimeout(() => signOut(), motion.fast);
  }, [close, signOut]);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onStart(() => {
          panStart.value = progress.value;
        })
        .onUpdate((event) => {
          const next = panStart.value + event.translationX / PANEL_WIDTH;
          progress.value = Math.min(1, Math.max(0, next));
        })
        .onEnd((event) => {
          // Fling left, or released past halfway back — treat as a dismiss.
          const shouldClose = event.velocityX < -400 || (event.velocityX <= 400 && progress.value < 0.5);
          if (shouldClose) {
            progress.value = withTiming(0, CLOSE_CONFIG, (finished) => {
              if (finished) runOnJS(setMounted)(false);
            });
          } else {
            progress.value = withTiming(1, CLOSE_CONFIG);
          }
        }),
    [panStart, progress],
  );

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(progress.value, [0, 1], [-PANEL_WIDTH, 0]) }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  return (
    <SideMenuContext.Provider value={api}>
      {children}

      {mounted && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Animated.View style={[styles.backdrop, backdropStyle]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close menu" />
          </Animated.View>

          <GestureDetector gesture={panGesture}>
            <Animated.View
              style={[
                styles.panel,
                { width: PANEL_WIDTH, paddingTop: insets.top + spacing.base },
                panelStyle,
              ]}
            >
              {/* Brand + identity */}
              <View style={styles.brandRow}>
                <Image source={require('../../assets/images/mainlogoNobg.png')} style={styles.logo} />
                <AppText variant="title" weight="bold">
                  FinGekko
                </AppText>
              </View>

              <Pressable style={styles.identity} onPress={() => handleNavigate('/(tabs)/profile')}>
                <UserAvatar size={46} navigateOnEmpty={false} onPress={() => handleNavigate('/(tabs)/profile')} />
                <View style={styles.identityText}>
                  <AppText variant="label" numberOfLines={1}>
                    {user?.fullName || user?.firstName || 'Your account'}
                  </AppText>
                  <AppText variant="micro" color="textTertiary" numberOfLines={1}>
                    {user?.primaryEmailAddress?.emailAddress ?? 'View profile'}
                  </AppText>
                </View>
              </Pressable>

              <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {MENU_SECTIONS.map((section) => (
                  <View key={section.title} style={styles.section}>
                    <AppText variant="micro" color="textTertiary" style={styles.sectionTitle}>
                      {section.title.toUpperCase()}
                    </AppText>
                    {section.items.map((item) => (
                      <MenuRow key={item.href} item={item} onNavigate={handleNavigate} />
                    ))}
                  </View>
                ))}
              </ScrollView>

              <Pressable
                style={({ pressed }) => [styles.signOut, { marginBottom: insets.bottom + spacing.md }, pressed && styles.rowPressed]}
                onPress={handleSignOut}
              >
                <Icon name="LogOut" size={18} color={palette.danger} clickable={false} />
                <AppText variant="label" style={styles.signOutText}>
                  Sign out
                </AppText>
              </Pressable>
            </Animated.View>
          </GestureDetector>
        </View>
      )}
    </SideMenuContext.Provider>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: palette.scrim,
  },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: palette.bgElevated,
    borderTopRightRadius: radius.xxl,
    borderBottomRightRadius: radius.xxl,
    paddingHorizontal: spacing.base,
    ...shadows.xl,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  logo: { width: 34, height: 34, resizeMode: 'contain' },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: palette.primaryLight,
  },
  identityText: { flex: 1, gap: 2 },
  scroll: { marginTop: spacing.lg },
  scrollContent: { paddingBottom: spacing.md },
  section: { marginBottom: spacing.lg },
  sectionTitle: { letterSpacing: 1, marginBottom: spacing.sm, paddingHorizontal: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
  },
  rowPressed: { backgroundColor: palette.cardMuted },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: palette.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 1 },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    borderTopWidth: 1,
    borderTopColor: palette.divider,
  },
  signOutText: { color: palette.danger, fontFamily: fontFamily.semibold },
});
