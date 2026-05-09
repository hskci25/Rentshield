import React, { useEffect, useState } from 'react';
import {
  Alert,
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

import { fetchProfileByMobile, upsertProfile } from '../api/profile';
import { colors, spacing, typography } from '../theme/tokens';

interface ProfileRequirementsScreenProps {
  mobileNumber: string;
  onSaved: () => void;
  isOnboarding?: boolean;
}

export default function ProfileRequirementsScreen({
  mobileNumber,
  onSaved,
  isOnboarding = false,
}: ProfileRequirementsScreenProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [fullName, setFullName] = useState('');
  const [employer, setEmployer] = useState('');
  const [occupation, setOccupation] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const profile = await fetchProfileByMobile(mobileNumber);
        if (profile) {
          setFullName(profile.full_name ?? '');
          setEmployer(profile.current_employer ?? '');
          setOccupation(profile.occupation ?? '');
        }
      } catch (error) {
        Alert.alert(
          'Could not load profile',
          error instanceof Error ? error.message : 'Please try again.',
        );
      } finally {
        setLoading(false);
      }
    };

    load().catch(() => undefined);
  }, [mobileNumber]);

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Missing details', 'Please enter your full name.');
      return;
    }

    try {
      setSaving(true);
      await upsertProfile({
        mobile_number: mobileNumber,
        full_name: fullName.trim(),
        current_employer: employer.trim(),
        occupation: occupation.trim(),
      });
      onSaved();
    } catch (error) {
      Alert.alert(
        'Save failed',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.flex}
    >
      <View style={styles.root}>
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <Text style={styles.brandTitle}>RENTSHIELD</Text>
          <Text style={styles.headerTitle}>PROFILE DETAILS</Text>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 120 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Section title="YOUR IDENTITY">
            <InputBlock
              label="Full Name"
              placeholder="Enter legal name"
              value={fullName}
              onChangeText={setFullName}
            />
            <InputBlock
              label="Current Employer"
              placeholder="Company name"
              value={employer}
              onChangeText={setEmployer}
            />
            <InputBlock
              label="Occupation"
              placeholder="e.g. Software Engineer"
              value={occupation}
              onChangeText={setOccupation}
            />
          </Section>

          <Text style={styles.helperText}>
            {loading
              ? 'Loading saved details...'
              : 'Your details are auto-loaded when available. Edit and save anytime.'}
          </Text>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Pressable
            style={({ pressed }) => [
              styles.ctaButton,
              (saving || loading) && styles.ctaDisabled,
              pressed && !saving && !loading && styles.ctaPressed,
            ]}
            disabled={saving || loading}
            onPress={handleSave}
          >
            <Text style={styles.ctaText}>
              {saving ? 'SAVING...' : isOnboarding ? 'SAVE & CONTINUE' : 'SAVE CHANGES'}
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function InputBlock({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'number-pad';
}): React.JSX.Element {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={colors.outlineVariant}
        value={value}
        onChangeText={onChangeText}
        style={styles.input}
        keyboardType={keyboardType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    minHeight: 84,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  brandTitle: {
    fontFamily: typography.serif.fontFamily,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.6,
    color: colors.onSurface,
  },
  headerTitle: {
    fontFamily: typography.label.fontFamily,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 2,
    color: colors.onSurfaceVariant,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontFamily: typography.label.fontFamily,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1.4,
    color: colors.outline,
    marginBottom: spacing.md,
  },
  sectionBody: {
    gap: spacing.xl,
  },
  field: {
    gap: spacing.sm,
  },
  label: {
    fontFamily: typography.label.fontFamily,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 1.2,
    color: colors.onSurfaceVariant,
  },
  input: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
    paddingBottom: spacing.sm,
    fontFamily: typography.body.fontFamily,
    fontSize: 16,
    color: colors.onSurface,
  },
  helperText: {
    marginTop: spacing.md,
    fontFamily: typography.body.fontFamily,
    fontSize: 13,
    lineHeight: 20,
    color: colors.outline,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  ctaButton: {
    height: 52,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: {
    opacity: 0.45,
  },
  ctaPressed: {
    opacity: 0.9,
  },
  ctaText: {
    fontFamily: typography.label.fontFamily,
    color: colors.onInk,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 2,
  },
});
