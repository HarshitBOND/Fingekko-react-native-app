import { Colors, FontSizes, Spacing } from '@/constants/Colors';
import { useSignUp } from '@clerk/clerk-expo';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function RegisterScreen() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Join FinGekko and start tracking.</Text>

          {!needsVerification ? (
            <>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  style={styles.input}
                  placeholder="Your name"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  style={styles.input}
                  placeholder="you@example.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  style={styles.input}
                  placeholder="Minimum 6 characters"
                  secureTextEntry
                />
              </View>
            </>
          ) : (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Verification code</Text>
              <TextInput
                value={verificationCode}
                onChangeText={setVerificationCode}
                style={styles.input}
                placeholder="123456"
                keyboardType="number-pad"
              />
            </View>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
            onPress={needsVerification ? handleVerify : handleRegister}
            disabled={isSubmitting}
          >
            <Text style={styles.primaryButtonText}>
              {isSubmitting
                ? needsVerification
                  ? 'Verifying...'
                  : 'Creating account...'
                : needsVerification
                  ? 'Verify email'
                  : 'Create account'}
            </Text>
          </Pressable>

          <Pressable style={styles.linkButton} onPress={() => router.back()}>
            <Text style={styles.linkText}>Already have an account? Sign in</Text>
          </Pressable>
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
});
