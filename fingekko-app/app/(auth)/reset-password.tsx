import { Colors, FontSizes, Spacing } from '@/constants/Colors';
import { useSignIn } from '@clerk/clerk-expo';
import { router } from 'expo-router';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

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
          <Text style={styles.title}>Reset password</Text>
          <Text style={styles.subtitle}>
            {stage === 'request'
              ? 'We will send a reset code to your email.'
              : 'Enter the code and set a new password.'}
          </Text>

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
                  <TouchableOpacity
                    onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                  >
                    <Icon name={isPasswordVisible ? "Eye" : "EyeOff"} size={20} color={Colors.textSecondary} />
                  </TouchableOpacity>
                }
              />
            </>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

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
    backgroundColor: '#f4f6f5',
    justifyContent: 'center',
    padding: Spacing.base,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    gap: Spacing.base,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: Spacing.base,
    paddingVertical: 12,
    fontSize: FontSizes.base,
    backgroundColor: Colors.background,
    color: Colors.textPrimary,
  },
  errorText: {
    color: Colors.expense,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: Colors.textLight,
    fontSize: FontSizes.base,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  linkButton: {
    alignItems: 'center',
  },
  linkText: {
    color: Colors.primaryDark,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: Spacing.base,
    backgroundColor: Colors.background,
  },

  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
  },
});
