import React, {useState} from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {signInAdmin} from '../services/auth';
import {spacing, typography} from '../tokens';

const appPalette = {
  bg: '#F8F1E8',
  card: '#FFFAF3',
  accent: '#7B111F',
  muted: '#9F7E56',
  surface: '#F4E2C8',
  text: '#4F0D17',
  buttonText: '#FFF8EF',
  border: 'rgba(123, 17, 31, 0.18)',
  error: '#B42318',
};

export function LoginScreen() {
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setError('Please enter your admin email and password.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await signInAdmin(cleanEmail, cleanPassword);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

      {/* Decorative Floating Background Shapes */}
      <View style={[styles.floatingShape, styles.shapeTopLeft]} />
      <View style={[styles.floatingShape, styles.shapeBottomLeft]} />
      <View style={[styles.floatingShape, styles.shapeTopRight]} />
      <View style={[styles.floatingShape, styles.shapeBottomRight]} />

      <View style={styles.contentContainer}>
        {/* Hero Section */}
        <Text style={styles.heroTitle}>Pacsmin</Text>
        <Text style={styles.subtitle}>
          Easily manage attendance and content for your event
        </Text>

        {!showForm ? (
          <Pressable style={styles.launchButton} onPress={() => setShowForm(true)}>
            <Text style={styles.launchButtonText}>Login</Text>
          </Pressable>
        ) : (
          <View style={styles.formWrap}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Admin Email"
              placeholderTextColor={appPalette.muted}
              style={styles.input}
            />

            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Password"
              placeholderTextColor={appPalette.muted}
              style={styles.input}
            />

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <Pressable
              onPress={handleLogin}
              disabled={isSubmitting}
              style={[styles.loginButton, isSubmitting && styles.loginButtonDisabled]}>
              {isSubmitting ? (
                <ActivityIndicator color={appPalette.buttonText} size="large" />
              ) : (
                <Text style={styles.loginButtonText}>Sign in</Text>
              )}
            </Pressable>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: appPalette.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Decorative Floating Shapes
  floatingShape: {
    position: 'absolute',
    opacity: 0.9,
  },
  shapeTopLeft: {
    top: 50,
    left: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: appPalette.card,
  },
  shapeBottomLeft: {
    bottom: 120,
    left: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(123, 17, 31, 0.22)',
  },
  shapeTopRight: {
    top: 80,
    right: 20,
    width: 90,
    height: 70,
    borderRadius: 16,
    backgroundColor: 'rgba(123, 17, 31, 0.16)',
    transform: [{rotate: '15deg'}],
  },
  shapeBottomRight: {
    bottom: 80,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(190, 145, 85, 0.26)',
  },

  // Main Content
  contentContainer: {
    width: '100%',
    maxWidth: 400,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    zIndex: 10,
  },

  // Hero Typography
  heroTitle: {
    color: appPalette.text,
    fontFamily: typography.serif,
    fontSize: 88,
    fontWeight: '700',
    letterSpacing: -2,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: appPalette.muted,
    fontFamily: typography.serif,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 48,
    paddingHorizontal: spacing.sm,
  },

  // Form
  formWrap: {
    width: '100%',
    gap: spacing.md,
  },
  launchButton: {
    width: '100%',
    backgroundColor: appPalette.accent,
    borderRadius: 36, // Made rounder
    paddingVertical: 24, // Increased padding to make it larger
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 4},
    elevation: 3,
  },
  launchButtonText: {
    color: appPalette.buttonText,
    fontFamily: typography.serif,
    fontSize: 22, // Increased font size
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  input: {
    width: '100%',
    backgroundColor: appPalette.surface,
    borderColor: appPalette.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 18,
    color: appPalette.text,
    fontFamily: typography.serif,
    fontSize: 17,
  },
  errorText: {
    color: appPalette.error,
    fontFamily: typography.serif,
    fontSize: 14,
    textAlign: 'center',
    marginTop: spacing.xs,
  },

  // Button
  loginButton: {
    marginTop: spacing.sm,
    width: '100%',
    backgroundColor: appPalette.accent,
    borderRadius: 36, // Made rounder
    paddingVertical: 24, // Increased padding to make it larger
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 4},
    elevation: 3,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: appPalette.buttonText,
    fontFamily: typography.serif,
    fontSize: 22, // Increased font size
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});