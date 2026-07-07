import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette, radius, shadows, spacing } from '@/constants/design';
import AppText from './AppText';
import Icon from './Icon';

export type ToastTone = 'success' | 'error' | 'info';

export type ToastAction = {
  label: string;
  onPress: () => void;
};

export type ToastConfig = {
  title: string;
  message?: string;
  tone?: ToastTone;
  action?: ToastAction;
  duration?: number;
};

type ToastProps = {
  toast: ToastConfig | null;
  onDismiss: () => void;
};

const TONE_META: Record<ToastTone, { icon: string; color: string; bg: string }> = {
  success: { icon: 'CheckCircle2', color: palette.success, bg: palette.successLight ?? 'rgba(34,166,89,0.12)' },
  error: { icon: 'XCircle', color: palette.danger, bg: 'rgba(235,90,79,0.1)' },
  info: { icon: 'Sparkles', color: palette.primaryDeep, bg: palette.primaryLight },
};

export default function Toast({ toast, onDismiss }: ToastProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!toast) return;

    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 8 }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      hide();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, toast.duration ?? 3200);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

  const hide = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -120, duration: 200, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onDismiss());
  };

  if (!toast) return null;

  const meta = TONE_META[toast.tone ?? 'success'];

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrap, { top: insets.top + 8, transform: [{ translateY }], opacity }]}
    >
      <View style={styles.card}>
        <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
          <Icon name={meta.icon} size={20} color={meta.color} clickable={false} />
        </View>
        <View style={styles.textCol}>
          <AppText variant="bodySm" color="textPrimary" weight="bold" numberOfLines={2}>
            {toast.title}
          </AppText>
          {!!toast.message && (
            <AppText variant="micro" color="textSecondary" numberOfLines={2}>
              {toast.message}
            </AppText>
          )}
        </View>
        {toast.action && (
          <Pressable
            style={styles.actionBtn}
            onPress={() => {
              toast.action?.onPress();
              hide();
            }}
            hitSlop={8}
          >
            <AppText variant="micro" color="primaryDeep" weight="bold">
              {toast.action.label}
            </AppText>
          </Pressable>
        )}
        <Pressable onPress={hide} hitSlop={10} style={styles.closeBtn}>
          <Icon name="X" size={14} color={palette.textTertiary} clickable={false} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.base,
    right: spacing.base,
    zIndex: 999,
    elevation: 999,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: palette.card,
    borderRadius: radius.xl,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: palette.border,
    ...shadows.lg,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    gap: 1,
  },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: palette.primaryLight,
  },
  closeBtn: {
    padding: 4,
  },
});
