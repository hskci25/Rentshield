import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { sendOtp, verifyOtp } from '../api/otp';
import { colors, spacing, typography } from '../theme/tokens';

interface OtpVerificationScreenProps {
  mobileNumber: string;
  /** When the server returns the OTP in the API (e.g. mock / review backend), show it here for sharing. */
  initialExposedOtp?: string | null;
  onBack: () => void;
  onVerified: () => void;
}

const OTP_LENGTH = 6;

function maskIndianNumber(mobileNumber: string): string {
  if (mobileNumber.length !== 10) return mobileNumber;
  return `+91 ${mobileNumber.slice(0, 2)}XXX XXX${mobileNumber.slice(8)}`;
}

export default function OtpVerificationScreen({
  mobileNumber,
  initialExposedOtp = null,
  onBack,
  onVerified,
}: OtpVerificationScreenProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [exposedOtpHint, setExposedOtpHint] = useState<string | null>(() => {
    if (typeof initialExposedOtp === 'string' && initialExposedOtp.trim().length > 0) {
      return initialExposedOtp.trim();
    }
    return null;
  });
  const hiddenInputRef = useRef<TextInput | null>(null);

  useEffect(() => {
    const next =
      typeof initialExposedOtp === 'string' && initialExposedOtp.trim().length > 0
        ? initialExposedOtp.trim()
        : null;
    setExposedOtpHint(next);
  }, [initialExposedOtp, mobileNumber]);

  const masked = useMemo(() => maskIndianNumber(mobileNumber), [mobileNumber]);
  const canSubmit = otp.length === OTP_LENGTH && !submitting;

  const digits = Array.from({ length: OTP_LENGTH }).map((_, index) => {
    return otp[index] ?? '';
  });

  const handleVerify = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setErrorText(null);
    try {
      await verifyOtp(mobileNumber, otp);
      Alert.alert('Verified', 'OTP verified successfully.');
      onVerified();
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : 'Invalid OTP');
    } finally {
      setSubmitting(false);
    }
  };

  const handleShareExposedOtp = async () => {
    if (!exposedOtpHint) return;
    try {
      await Share.share({
        message: `RentShield verification code: ${exposedOtpHint}`,
        title: 'RentShield code',
      });
    } catch {
      // User dismissed the share sheet.
    }
  };

  const handleResend = async () => {
    try {
      setResending(true);
      setErrorText(null);
      setOtp('');
      const response = await sendOtp(mobileNumber);
      const next =
        typeof response.otp === 'string' && response.otp.trim().length > 0
          ? response.otp.trim()
          : null;
      if (next) {
        setExposedOtpHint(next);
      }
      Alert.alert('OTP resent', 'A new code has been sent.');
    } catch (error) {
      setErrorText(
        error instanceof Error ? error.message : 'Failed to resend OTP',
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.flex}
    >
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={onBack} hitSlop={12}>
            <Text style={styles.backArrow}>{"\u2190"}</Text>
          </Pressable>
          <Text style={styles.headerWordmark}>RENTSHIELD</Text>
          <View style={styles.headerSpacer} />
        </View>

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
          <View style={styles.content}>
            <Text style={styles.title}>Verify your{"\n"}number.</Text>
            <Text style={styles.subtitle}>
              We sent a 6-digit code to {masked}.
            </Text>

            {exposedOtpHint ? (
              <View style={styles.exposedOtpCard}>
                <Text style={styles.exposedOtpLabel}>Code (testing / review)</Text>
                <Text style={styles.exposedOtpDigits} selectable>
                  {exposedOtpHint}
                </Text>
                <Text style={styles.exposedOtpFootnote}>
                  Shown when the server returns the code (e.g. mock OTP). Not shown for normal SMS-only
                  production.
                </Text>
                <Pressable
                  onPress={() => void handleShareExposedOtp()}
                  style={({ pressed }) => [styles.shareOtpButton, pressed && styles.shareOtpButtonPressed]}
                >
                  <Text style={styles.shareOtpLabel}>SHARE CODE</Text>
                </Pressable>
              </View>
            ) : null}

            <Pressable
              onPress={() => hiddenInputRef.current?.focus()}
              style={styles.otpRow}
            >
              {digits.map((digit, index) => {
                const active = index === otp.length && otp.length < OTP_LENGTH;
                return (
                  <View
                    key={index}
                    style={[styles.otpCell, active && styles.otpCellActive]}
                  >
                    <Text style={styles.otpDigit}>
                      {digit || (active ? '|' : '')}
                    </Text>
                  </View>
                );
              })}
            </Pressable>

            <TextInput
              ref={hiddenInputRef}
              value={otp}
              onChangeText={(value) => {
                const next = value.replace(/\D/g, '').slice(0, OTP_LENGTH);
                setOtp(next);
              }}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              maxLength={OTP_LENGTH}
              style={styles.hiddenInput}
              autoFocus
            />

            <Pressable
              onPress={handleResend}
              disabled={resending}
              style={styles.resendRow}
            >
              <Text style={styles.resend}>
                {resending ? 'RESENDING...' : 'RESEND CODE'}
              </Text>
            </Pressable>
            {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
            <View style={styles.archBlock} />
          </View>

          <View style={styles.spacer} />

          <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.xl }]}>
            <Pressable
              onPress={handleVerify}
              disabled={!canSubmit}
              style={({ pressed }) => [
                styles.cta,
                !canSubmit && styles.ctaDisabled,
                pressed && canSubmit && styles.ctaPressed,
              ]}
            >
              <Text style={styles.ctaLabel}>
                {submitting ? 'VERIFYING...' : 'VERIFY & ENTER'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    height: 64,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backArrow: {
    fontSize: 20,
    color: colors.onSurface,
  },
  headerWordmark: {
    fontFamily: typography.wordmarkHeader.fontFamily,
    color: colors.onSurface,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.6,
  },
  headerSpacer: { width: 24 },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
  },
  scrollContent: {
    flexGrow: 1,
  },
  spacer: {
    flex: 1,
    minHeight: spacing.xl,
  },
  title: {
    fontFamily: typography.serif.fontFamily,
    fontSize: 52,
    lineHeight: 56,
    color: colors.onSurface,
    marginBottom: spacing.md,
    letterSpacing: -1.1,
  },
  subtitle: {
    fontFamily: typography.body.fontFamily,
    fontSize: 16,
    lineHeight: 24,
    color: colors.onSurfaceVariant,
    maxWidth: 280,
  },
  exposedOtpCard: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.outlineVariant,
  },
  exposedOtpLabel: {
    fontFamily: typography.label.fontFamily,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.onSurfaceVariant,
  },
  exposedOtpDigits: {
    marginTop: spacing.sm,
    fontFamily: typography.serif.fontFamily,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: 4,
    color: colors.onSurface,
  },
  exposedOtpFootnote: {
    marginTop: spacing.sm,
    fontFamily: typography.body.fontFamily,
    fontSize: 12,
    lineHeight: 18,
    color: colors.onSurfaceVariant,
  },
  shareOtpButton: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.outline,
    backgroundColor: colors.surface,
  },
  shareOtpButtonPressed: {
    opacity: 0.85,
  },
  shareOtpLabel: {
    fontFamily: typography.label.fontFamily,
    fontSize: 10,
    letterSpacing: 1.2,
    color: colors.onSurface,
  },
  otpRow: {
    marginTop: spacing.xxl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  otpCell: {
    width: 44,
    height: 64,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpCellActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.onSurface,
  },
  otpDigit: {
    fontFamily: typography.serif.fontFamily,
    color: colors.onSurface,
    fontSize: 30,
    lineHeight: 34,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
  },
  resend: {
    fontFamily: typography.label.fontFamily,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1.2,
    color: colors.outline,
  },
  resendRow: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
  },
  error: {
    marginTop: spacing.sm,
    fontFamily: typography.body.fontFamily,
    color: '#B00020',
    fontSize: 13,
  },
  archBlock: {
    marginTop: 'auto',
    marginBottom: spacing.xl,
    height: 112,
    backgroundColor: '#DDDADB',
    borderRadius: 0,
  },
  footer: {
    paddingHorizontal: spacing.lg,
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
  },
  ctaLabel: {
    fontFamily: typography.label.fontFamily,
    color: colors.onInk,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 2,
  },
});
