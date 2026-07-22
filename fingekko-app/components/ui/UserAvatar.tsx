import { useUser } from '@clerk/clerk-expo';
import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { palette, shadows } from '../../constants/design';
import Icon from './Icon';

interface UserAvatarProps {
  size?: number;
  /** When true, tapping a missing photo navigates to the profile page to add one. */
  navigateOnEmpty?: boolean;
  onPress?: () => void;
}

export default function UserAvatar({ size = 42, navigateOnEmpty = true, onPress }: UserAvatarProps) {
  const { user } = useUser();
  const hasPhoto = Boolean(user?.hasImage && user?.imageUrl);

  const handlePress = onPress ?? (navigateOnEmpty ? () => router.push('/(tabs)/profile') : undefined);

  const content = hasPhoto ? (
    <Image source={{ uri: user!.imageUrl }} style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]} />
  ) : (
    <View style={[styles.empty, { width: size, height: size, borderRadius: size / 2 }]}>
      <Icon name="Plus" size={Math.round(size * 0.45)} color={palette.primary} />
    </View>
  );

  if (!handlePress) return content;

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={hasPhoto ? 'Your profile' : 'Add a profile photo'}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  image: {
    borderWidth: 2,
    borderColor: palette.card,
    ...shadows.sm,
  },
  empty: {
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: palette.border,
    ...shadows.sm,
  },
});
