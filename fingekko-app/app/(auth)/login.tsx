import { useSignIn } from '@clerk/clerk-expo';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  View,
} from 'react-native';
import AppText from '../../components/ui/AppText';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import Input from '../../components/ui/Input';
import { palette, radius, shadows, spacing } from '../../constants/design';

export default function LoginScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleLogin = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      if (!isLoaded) {
        setIsSubmitting(false);
        return;
      }

      const result = await signIn.create({
        strategy: 'password',
        identifier: email.trim(),
        password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace('/(tabs)');
      } else {
        setError('Additional verification required.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to sign in.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <AppText variant="h1" color="textPrimary">Welcome back</AppText>
          <AppText variant="bodySm" color="textSecondary" style={styles.subtitle}>
            Sign in to continue.
          </AppText>

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            secureTextEntry={!isPasswordVisible}
            rightIcon={
              <Pressable
                onPress={() => setIsPasswordVisible((v) => !v)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
              >
                <Icon name={isPasswordVisible ? 'Eye' : 'EyeOff'} size={20} color={palette.textSecondary} />
              </Pressable>
            }
          />

          <Button variant="ghost" size="sm" onPress={() => router.push('/(auth)/reset-password')}>
            Forgot password?
          </Button>

          {error ? (
            <AppText variant="caption" color="danger" weight="semibold">
              {error}
            </AppText>
          ) : null}

          <Button
            variant="primary"
            size="lg"
            onPress={handleLogin}
            disabled={isSubmitting}
            loading={isSubmitting}
          >
            Sign in
          </Button>

          <Button variant="ghost" size="md" onPress={() => router.push('/(auth)/register')}>
            Create an account
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bg,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: palette.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.base,
    ...shadows.md,
  },
  subtitle: {
    marginTop: -spacing.sm,
  },
});
