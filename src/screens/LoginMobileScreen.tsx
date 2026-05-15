import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Alert,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line } from 'react-native-svg';

import { sendOtp } from '../api/otp';
import { colors, motion, spacing, typography } from '../theme/tokens';

const PHONE_MAX_DIGITS = 10;

function normalizeIndianTenDigitInput(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length >= 12) {
    digits = digits.slice(2);
  }
  return digits.slice(0, PHONE_MAX_DIGITS);
}

function formatIndianPhone(digits: string): string {
  if (digits.length <= 5) {
    return digits;
  }
  return `${digits.slice(0, 5)} ${digits.slice(5, 10)}`;
}

/**
 * RentShield — Login (Mobile Number) screen.
 *
 * Editorial fintech entry point: a small serif "RENTSHIELD" header,
 * a two-beat "Move in. Worry less." headline, a 10-digit mobile field
 * with a hairline underline, an ink-coloured "Get code" CTA, and an
 * architectural blueprint motif anchored to the right edge.
 *
 * Users enter ten digits only; pastes that include leading country code
 * 91 are normalized. The OTP API receives the 10-digit string.
 *
 * The body uses a ScrollView + flex spacer so the footer stays pinned
 * to the bottom when content fits, but scrolls cleanly above the
 * software keyboard on both iOS and Android.
 */
export interface OtpSentPayload {
  mobileNumber: string;
  /** Present when backend exposes OTP (e.g. mock / dev); omitted for normal SMS-only flows. */
  exposedOtp?: string | null;
}

interface LoginMobileScreenProps {
  onOtpSent: (payload: OtpSentPayload) => void;
}

export function LoginMobileScreen({
  onOtpSent,
}: LoginMobileScreenProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [rawDigits, setRawDigits] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isValid = rawDigits.length === PHONE_MAX_DIGITS;

  // Stagger the screen entrance — content rises from below as splash exits.
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heroTranslateY = useRef(new Animated.Value(16)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(20)).current;
  const ctaOpacity = useRef(new Animated.Value(0)).current;
  const ctaTranslateY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.stagger(100, [
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: motion.loginEnter,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(heroOpacity, {
          toValue: 1,
          duration: motion.loginEnter,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(heroTranslateY, {
          toValue: 0,
          duration: motion.loginEnter,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(formOpacity, {
          toValue: 1,
          duration: motion.loginEnter,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(formTranslateY, {
          toValue: 0,
          duration: motion.loginEnter,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(ctaOpacity, {
          toValue: 1,
          duration: motion.loginEnter,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(ctaTranslateY, {
          toValue: 0,
          duration: motion.loginEnter,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [
    ctaOpacity,
    ctaTranslateY,
    formOpacity,
    formTranslateY,
    headerOpacity,
    heroOpacity,
    heroTranslateY,
  ]);

  const formattedDigits = useMemo(
    () => formatIndianPhone(rawDigits),
    [rawDigits],
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.flex}
    >
      <View style={[styles.root, { paddingTop: insets.top }]}>
        {/* Architectural blueprint motif — anchored off-canvas right. */}
        <View
          pointerEvents="none"
          style={[styles.blueprintMotif, { opacity: 0.03 }]}
        >
          <Svg width={400} height={600} viewBox="0 0 400 600">
            <Line
              x1={0.5}
              x2={0.5}
              y1={0}
              y2={600}
              stroke={colors.onBackground}
              strokeWidth={0.5}
            />
            <Line
              x1={100.5}
              x2={100.5}
              y1={0}
              y2={600}
              stroke={colors.onBackground}
              strokeWidth={0.5}
            />
            <Line
              x1={200.5}
              x2={200.5}
              y1={0}
              y2={600}
              stroke={colors.onBackground}
              strokeWidth={0.5}
            />
            <Line
              x1={300.5}
              x2={300.5}
              y1={0}
              y2={600}
              stroke={colors.onBackground}
              strokeWidth={0.5}
            />
            <Line
              x1={0}
              x2={400}
              y1={100.5}
              y2={100.5}
              stroke={colors.onBackground}
              strokeWidth={0.5}
            />
            <Line
              x1={0}
              x2={400}
              y1={200.5}
              y2={200.5}
              stroke={colors.onBackground}
              strokeWidth={0.5}
            />
            <Line
              x1={0}
              x2={400}
              y1={300.5}
              y2={300.5}
              stroke={colors.onBackground}
              strokeWidth={0.5}
            />
          </Svg>
        </View>

        {/* Header wordmark. */}
        <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
          <Text
            allowFontScaling={false}
            accessibilityRole="header"
            style={styles.headerWordmark}
          >
            RENTSHIELD
          </Text>
        </Animated.View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          bounces={false}
          {...(Platform.OS === 'ios'
            ? { automaticallyAdjustKeyboardInsets: true }
            : null)}
        >
          {/* Hero copy. */}
          <Animated.View
            style={[
              styles.hero,
              {
                opacity: heroOpacity,
                transform: [{ translateY: heroTranslateY }],
              },
            ]}
          >
            <Text
              allowFontScaling={false}
              accessibilityRole="header"
              style={styles.heroTitle}
            >
              Move in.{'\n'}Worry less.
            </Text>
            <Text style={styles.heroBody}>
              Drop your mobile number — we'll send a secure access code to
              unlock your shielded tenancy.
            </Text>
          </Animated.View>

          {/* Mobile number field. */}
          <Animated.View
            style={[
              styles.field,
              {
                opacity: formOpacity,
                transform: [{ translateY: formTranslateY }],
              },
            ]}
          >
            <Text style={styles.fieldLabel}>MOBILE NUMBER (10 DIGITS)</Text>
            <View
              style={[
                styles.fieldRow,
                isFocused ? styles.fieldRowFocused : undefined,
              ]}
            >
              <TextInput
                value={formattedDigits}
                onChangeText={(next) => setRawDigits(normalizeIndianTenDigitInput(next))}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="98765 43210"
                placeholderTextColor={colors.outlineVariant}
                keyboardType="phone-pad"
                inputMode="numeric"
                autoComplete="tel"
                textContentType="telephoneNumber"
                maxLength={15}
                accessibilityLabel="Ten digit mobile number"
                style={styles.input}
                allowFontScaling={false}
                returnKeyType="done"
              />
            </View>
          </Animated.View>

          {/* Flex spacer keeps the footer pinned to the bottom when content
              fits, and turns into scroll slack when the keyboard is open. */}
          <View style={styles.spacer} />

          {/* Footer CTA. */}
          <Animated.View
            style={[
              styles.footer,
              {
                paddingBottom: insets.bottom + spacing.xl,
                opacity: ctaOpacity,
                transform: [{ translateY: ctaTranslateY }],
              },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !isValid || submitting }}
              disabled={!isValid || submitting}
              onPress={async () => {
                try {
                  setSubmitting(true);
                  const response = await sendOtp(rawDigits);
                  onOtpSent({
                    mobileNumber: rawDigits,
                    exposedOtp: response.otp ?? null,
                  });
                } catch (error) {
                  Alert.alert(
                    'OTP failed',
                    error instanceof Error
                      ? error.message
                      : 'Could not send OTP. Please try again.',
                  );
                } finally {
                  setSubmitting(false);
                }
              }}
              style={({ pressed }) => [
                styles.cta,
                (!isValid || submitting) && styles.ctaDisabled,
                pressed && isValid && !submitting && styles.ctaPressed,
              ]}
            >
              <Text allowFontScaling={false} style={styles.ctaLabel}>
                {submitting ? 'SENDING...' : 'GET CODE'}
              </Text>
            </Pressable>

            <Text style={styles.legal}>
              By continuing, you agree to our{' '}
              <Text style={styles.legalLink}>judicial terms</Text> and{' '}
              <Text style={styles.legalLink}>privacy policy</Text>.
            </Text>
          </Animated.View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  blueprintMotif: {
    position: 'absolute',
    top: '25%',
    right: -96,
  },
  header: {
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  headerWordmark: {
    fontFamily: typography.wordmarkHeader.fontFamily,
    color: colors.onBackground,
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: typography.wordmarkHeader.letterSpacing,
    ...Platform.select({
      android: { includeFontPadding: false as const },
    }),
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
  },
  spacer: {
    flex: 1,
    minHeight: spacing.xxl,
  },
  hero: {
    marginBottom: spacing.xxl,
  },
  heroTitle: {
    fontFamily: typography.serif.fontFamily,
    color: colors.onSurface,
    fontSize: 48,
    lineHeight: 56,
    letterSpacing: -0.96,
    marginBottom: spacing.md,
  },
  heroBody: {
    fontFamily: typography.body.fontFamily,
    color: colors.onSurfaceVariant,
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 280,
  },
  field: {
    gap: spacing.md,
  },
  fieldLabel: {
    fontFamily: typography.label.fontFamily,
    color: colors.outline,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1.2,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  fieldRowFocused: {
    borderBottomWidth: 1,
    borderBottomColor: colors.onSurface,
  },
  input: {
    flex: 1,
    fontFamily: typography.serif.fontFamily,
    color: colors.onSurface,
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.48,
    padding: 0,
    ...Platform.select({
      android: { includeFontPadding: false as const, paddingVertical: 0 },
    }),
  },
  footer: {
    gap: spacing.lg,
    paddingTop: spacing.xl,
  },
  cta: {
    height: 56,
    backgroundColor: colors.ink,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: {
    opacity: 0.45,
  },
  ctaPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  ctaLabel: {
    fontFamily: typography.label.fontFamily,
    color: colors.onInk,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 2,
  },
  legal: {
    fontFamily: typography.body.fontFamily,
    color: colors.outline,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  legalLink: {
    color: colors.onSurfaceVariant,
    textDecorationLine: 'underline',
  },
});

export default LoginMobileScreen;
