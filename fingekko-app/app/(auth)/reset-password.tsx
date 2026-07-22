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

type ResetStage = 'request' | 'verify';

export default function ResetPasswordScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const [stage, setStage] = useState<ResetStage>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handleRequest = async () => {
    setError('');
    setIsSubmitting(true);

    try {
      if (!isLoaded) {
        return;
      }

      await signIn.create({ identifier: email.trim() });
      const resetFactor = signIn.supportedFirstFactors?.find(
        (factor) => factor.strategy === 'reset_password_email_code'
      );
      if (!resetFactor || !('emailAddressId' in resetFactor)) {
        throw new Error('Reset password is not available for this account.');
      }
      await signIn.prepareFirstFactor({
        strategy: 'reset_password_email_code',
        emailAddressId: resetFactor.emailAddressId,
      });
      setStage('verify');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to start reset.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = async () => {
    setError('');
    setIsSubmitting(true);

    try {
      if (!isLoaded) {
        return;
      }

      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: code.trim(),
        password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        return;
      }

      setError('Reset not complete. Please check the code and try again.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to reset password.';
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
          <AppText variant="h1" color="textPrimary">Reset password</AppText>
          <AppText variant="bodySm" color="textSecondary" style={styles.subtitle}>
            {stage === 'request'
              ? 'We will send a reset code to your email.'
              : 'Enter the code and set a new password.'}
          </AppText>

          {stage === 'request' ? (
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
            />
          ) : (
            <>
              <Input
                label="Verification code"
                value={code}
                onChangeText={setCode}
                placeholder="123456"
                keyboardType="number-pad"
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
            </>
          )}

          {error ? (
            <AppText variant="caption" color="danger" weight="semibold">
              {error}
            </AppText>
          ) : null}

          <Button
            variant="primary"
            size="lg"
            onPress={stage === 'request' ? handleRequest : handleReset}
            disabled={isSubmitting}
            loading={isSubmitting}
          >
            {stage === 'request' ? 'Send code' : 'Reset password'}
          </Button>

          <Button variant="ghost" size="md" onPress={() => router.back()}>
            Back to sign in
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
