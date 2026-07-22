import { useSignUp } from '@clerk/clerk-expo';
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

export default function RegisterScreen() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleRegister = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      if (!isLoaded) {
        setIsSubmitting(false);
        return;
      }

      const result = await signUp.create({
        emailAddress: email.trim(),
        password,
        firstName: name.trim() || undefined,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        return;
      }

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setNeedsVerification(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to sign up.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      if (!isLoaded) {
        setIsSubmitting(false);
        return;
      }

      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode.trim(),
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
      } else {
        setError('Verification failed. Try again.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to verify email.';
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
          <AppText variant="h1" color="textPrimary">Create account</AppText>
          <AppText variant="bodySm" color="textSecondary" style={styles.subtitle}>
            Join FinGekko and start tracking.
          </AppText>

          {!needsVerification ? (
            <>
              <Input
                label="Name"
                value={name}
                onChangeText={setName}
                placeholder="Your name"
              />

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
                placeholder="Minimum 6 characters"
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
            </>
          ) : (
            <Input
              label="Verification code"
              value={verificationCode}
              onChangeText={setVerificationCode}
              placeholder="123456"
              keyboardType="number-pad"
            />
          )}

          {error ? (
            <AppText variant="caption" color="danger" weight="semibold">
              {error}
            </AppText>
          ) : null}

          <Button
            variant="primary"
            size="lg"
            onPress={needsVerification ? handleVerify : handleRegister}
            disabled={isSubmitting}
            loading={isSubmitting}
          >
            {needsVerification ? 'Verify email' : 'Create account'}
          </Button>

          <Button variant="ghost" size="md" onPress={() => router.back()}>
            Already have an account? Sign in
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
