import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  EVIDENCE_SLOTS,
  EvidenceRecord,
  EvidenceSlotId,
  EvidenceUpload,
  MoveInEvidenceError,
  fetchMoveInEvidence,
  submitMoveInEvidence,
} from '../api/moveInEvidence';
import { colors, spacing, typography } from '../theme/tokens';

interface MoveInDocumentationScreenProps {
  mobileNumber: string;
}

interface PendingItem {
  uri: string;
  mimeType: string;
  capturedAt: number;
  latitude: number | null;
  longitude: number | null;
  accuracyMeters: number | null;
}

const COMPRESS_MAX_WIDTH = 1600;
const COMPRESS_QUALITY = 0.7;

async function compressForUpload(uri: string): Promise<{
  uri: string;
  mimeType: string;
}> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: COMPRESS_MAX_WIDTH } }],
    {
      compress: COMPRESS_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  );
  return { uri: result.uri, mimeType: 'image/jpeg' };
}

type CaptureMap = Partial<Record<EvidenceSlotId, PendingItem>>;
type RecordMap = Partial<Record<EvidenceSlotId, EvidenceRecord>>;

type CaptureSource = 'camera' | 'library';

async function readGps(): Promise<{
  latitude: number | null;
  longitude: number | null;
  accuracyMeters: number | null;
}> {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) {
      return { latitude: null, longitude: null, accuracyMeters: null };
    }
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracyMeters: position.coords.accuracy ?? null,
    };
  } catch {
    return { latitude: null, longitude: null, accuracyMeters: null };
  }
}

function formatTimestamp(value: number | string): string {
  const date = typeof value === 'number' ? new Date(value) : new Date(value);
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatGps(lat: number | null, lng: number | null): string {
  if (lat == null || lng == null) return 'GPS unavailable';
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export default function MoveInDocumentationScreen({
  mobileNumber,
}: MoveInDocumentationScreenProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [pending, setPending] = useState<CaptureMap>({});
  const [locked, setLocked] = useState<RecordMap>({});
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingExisting(true);
      try {
        const records = await fetchMoveInEvidence(mobileNumber);
        if (cancelled) return;
        if (records.length > 0) {
          const map: RecordMap = {};
          for (const record of records) {
            map[record.slot as EvidenceSlotId] = record;
          }
          setLocked(map);
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof MoveInEvidenceError) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mobileNumber]);

  const lockedCount = Object.keys(locked).length;
  const pendingCount = Object.keys(pending).length;
  const isLocked = lockedCount === EVIDENCE_SLOTS.length;
  const completed = isLocked ? lockedCount : pendingCount;

  const lockedAt = useMemo(() => {
    if (!isLocked) return null;
    const captures = Object.values(locked)
      .map((r) => r?.captured_at)
      .filter((s): s is string => Boolean(s));
    if (captures.length === 0) return null;
    const sorted = [...captures].sort();
    return sorted[0];
  }, [locked, isLocked]);

  async function captureForSlot(
    slot: EvidenceSlotId,
    source: CaptureSource,
  ): Promise<void> {
    if (isLocked || submitting) return;
    setError(null);

    let asset: ImagePicker.ImagePickerAsset | undefined;

    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Camera permission required',
          'Enable camera access in Settings to capture move-in evidence.',
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 1,
        allowsEditing: false,
        exif: true,
      });
      if (result.canceled) return;
      asset = result.assets[0];
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Photo access required',
          'Enable photo access in Settings to attach move-in evidence.',
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        quality: 1,
        exif: true,
      });
      if (result.canceled) return;
      asset = result.assets[0];
    }

    if (!asset) return;

    try {
      const compressed = await compressForUpload(asset.uri);
      const gps = await readGps();
      setPending((prev) => ({
        ...prev,
        [slot]: {
          uri: compressed.uri,
          mimeType: compressed.mimeType,
          capturedAt: Date.now(),
          ...gps,
        },
      }));
    } catch (err) {
      setError(
        err instanceof Error
          ? `Could not prepare image: ${err.message}`
          : 'Could not prepare image for upload.',
      );
    }
  }

  function removePending(slot: EvidenceSlotId): void {
    if (submitting) return;
    setPending((prev) => {
      const next = { ...prev };
      delete next[slot];
      return next;
    });
  }

  async function handleSubmit(): Promise<void> {
    if (pendingCount < EVIDENCE_SLOTS.length) {
      setError('Capture all five slots before locking evidence.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const uploads: EvidenceUpload[] = EVIDENCE_SLOTS.map((slot) => {
        const item = pending[slot.id]!;
        return {
          slot: slot.id,
          fileUri: item.uri,
          mimeType: item.mimeType,
          capturedAt: item.capturedAt,
          latitude: item.latitude,
          longitude: item.longitude,
          accuracyMeters: item.accuracyMeters,
        };
      });
      const records = await submitMoveInEvidence(mobileNumber, uploads);
      const map: RecordMap = {};
      for (const record of records) {
        map[record.slot as EvidenceSlotId] = record;
      }
      setLocked(map);
      setPending({});
      Alert.alert(
        'Evidence locked',
        'Your move-in walkthrough is timestamped and stored as evidence.',
      );
    } catch (err) {
      if (err instanceof MoveInEvidenceError || err instanceof Error) {
        setError(err.message);
      } else {
        setError('Could not lock evidence. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.headerSide} />
        <Text style={styles.headerTitle}>MOVE-IN · WALKTHROUGH</Text>
        <View style={styles.headerSide}>
          {loadingExisting ? (
            <ActivityIndicator size="small" color={colors.onSurface} />
          ) : null}
        </View>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.xxl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <Text style={styles.eyebrow}>EVIDENCE</Text>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreNumber}>
              {String(completed).padStart(2, '0')}
            </Text>
            <Text style={styles.scoreUnit}>
              / {String(EVIDENCE_SLOTS.length).padStart(2, '0')}
            </Text>
          </View>
          <Text style={styles.heroTagline}>
            {isLocked
              ? `Walkthrough locked on ${
                  lockedAt ? formatTimestamp(lockedAt) : '—'
                }. Each photo is timestamped and GPS-stamped as proof of move-in condition.`
              : 'Capture the move-in condition of every key area. Each photo is timestamped and GPS-stamped, then locked as proof if anything is disputed at move-out.'}
          </Text>
        </View>

        <View style={styles.divider} />

        {error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.slotList}>
          {EVIDENCE_SLOTS.map((slot, index) => {
            const lockedItem = locked[slot.id];
            const pendingItem = pending[slot.id];
            const isDone = Boolean(lockedItem);
            const isCaptured = Boolean(pendingItem) || isDone;

            return (
              <View
                key={slot.id}
                style={[styles.slotCard, isCaptured && styles.slotCardDone]}
              >
                <View style={styles.slotHeaderRow}>
                  <Text style={styles.slotIndex}>
                    {String(index + 1).padStart(2, '0')}
                  </Text>
                  <View style={styles.slotHeaderText}>
                    <Text style={styles.slotLabel}>{slot.label}</Text>
                    <Text style={styles.slotDescription}>
                      {slot.description}
                    </Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <View
                      style={[
                        styles.statusDot,
                        isDone
                          ? styles.statusDotDone
                          : pendingItem
                            ? styles.statusDotPending
                            : styles.statusDotIdle,
                      ]}
                    />
                    <Text style={styles.statusText}>
                      {isDone ? 'LOCKED' : pendingItem ? 'READY' : 'PENDING'}
                    </Text>
                  </View>
                </View>

                {isDone && lockedItem ? (
                  <View style={styles.previewRow}>
                    <Image
                      source={{ uri: lockedItem.image_url }}
                      style={styles.previewImage}
                      resizeMode="cover"
                    />
                    <View style={styles.previewMeta}>
                      <Text style={styles.metaLabel}>CAPTURED</Text>
                      <Text style={styles.metaValue}>
                        {formatTimestamp(lockedItem.captured_at)}
                      </Text>
                      <Text style={styles.metaLabel}>LOCATION</Text>
                      <Text style={styles.metaValue}>
                        {formatGps(lockedItem.latitude, lockedItem.longitude)}
                      </Text>
                    </View>
                  </View>
                ) : pendingItem ? (
                  <View>
                    <View style={styles.previewRow}>
                      <Image
                        source={{ uri: pendingItem.uri }}
                        style={styles.previewImage}
                        resizeMode="cover"
                      />
                      <View style={styles.previewMeta}>
                        <Text style={styles.metaLabel}>CAPTURED</Text>
                        <Text style={styles.metaValue}>
                          {formatTimestamp(pendingItem.capturedAt)}
                        </Text>
                        <Text style={styles.metaLabel}>LOCATION</Text>
                        <Text style={styles.metaValue}>
                          {formatGps(
                            pendingItem.latitude,
                            pendingItem.longitude,
                          )}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.actionRow}>
                      <Pressable
                        style={({ pressed }) => [
                          styles.secondaryAction,
                          pressed && styles.actionPressed,
                          submitting && styles.disabledAction,
                        ]}
                        onPress={() => removePending(slot.id)}
                        disabled={submitting}
                      >
                        <Text style={styles.secondaryActionText}>REMOVE</Text>
                      </Pressable>
                      <Pressable
                        style={({ pressed }) => [
                          styles.secondaryAction,
                          pressed && styles.actionPressed,
                          submitting && styles.disabledAction,
                        ]}
                        onPress={() => captureForSlot(slot.id, 'camera')}
                        disabled={submitting}
                      >
                        <Text style={styles.secondaryActionText}>RETAKE</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View style={styles.actionRow}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.captureButton,
                        pressed && styles.actionPressed,
                      ]}
                      onPress={() => captureForSlot(slot.id, 'camera')}
                      disabled={submitting}
                    >
                      <Text style={styles.captureIcon}>＋</Text>
                      <Text style={styles.captureLabel}>TAKE PHOTO</Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [
                        styles.captureButton,
                        pressed && styles.actionPressed,
                      ]}
                      onPress={() => captureForSlot(slot.id, 'library')}
                      disabled={submitting}
                    >
                      <Text style={styles.captureIcon}>▢</Text>
                      <Text style={styles.captureLabel}>FROM LIBRARY</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {!isLocked && (
          <View style={styles.submitWrap}>
            <Pressable
              style={({ pressed }) => [
                styles.primaryAction,
                pressed && styles.actionPressed,
                (submitting ||
                  pendingCount < EVIDENCE_SLOTS.length) &&
                  styles.disabledAction,
              ]}
              onPress={handleSubmit}
              disabled={
                submitting || pendingCount < EVIDENCE_SLOTS.length
              }
            >
              {submitting ? (
                <View style={styles.primaryActionInner}>
                  <ActivityIndicator size="small" color={colors.onInk} />
                  <Text style={styles.primaryActionText}>LOCKING</Text>
                </View>
              ) : (
                <Text style={styles.primaryActionText}>
                  {pendingCount < EVIDENCE_SLOTS.length
                    ? `${pendingCount}/${EVIDENCE_SLOTS.length} CAPTURED`
                    : 'LOCK EVIDENCE'}
                </Text>
              )}
            </Pressable>
            <Text style={styles.submitHint}>
              Once locked, each photo is timestamped, GPS-stamped, and stored
              as evidence. You won't be able to retake from this device.
            </Text>
          </View>
        )}

        {isLocked && (
          <View style={styles.lockedNote}>
            <Text style={styles.eyebrow}>EVIDENCE FILE</Text>
            <Text style={styles.lockedBody}>
              Your move-in walkthrough is preserved with capture timestamps and
              location. We'll surface it automatically at move-out to defend
              your security deposit if any clause is disputed.
            </Text>
          </View>
        )}
      </ScrollView>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
  },
  headerSide: {
    minWidth: 56,
    alignItems: 'flex-end',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: typography.label.fontFamily,
    fontSize: 10,
    letterSpacing: 1.6,
    color: colors.onSurfaceVariant,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.lg,
  },
  heroSection: {
    gap: spacing.sm,
  },
  eyebrow: {
    fontFamily: typography.label.fontFamily,
    fontSize: 10,
    letterSpacing: 1.6,
    color: colors.onSurfaceVariant,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  scoreNumber: {
    fontFamily: typography.serif.fontFamily,
    fontSize: 64,
    lineHeight: 68,
    letterSpacing: -1.2,
    color: colors.onSurface,
  },
  scoreUnit: {
    fontFamily: typography.body.fontFamily,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    paddingBottom: spacing.sm,
  },
  heroTagline: {
    fontFamily: typography.body.fontFamily,
    fontSize: 16,
    lineHeight: 24,
    color: colors.onSurfaceVariant,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.outlineVariant,
    marginVertical: spacing.sm,
  },
  errorText: {
    fontFamily: typography.body.fontFamily,
    fontSize: 13,
    lineHeight: 20,
    color: '#B3261E',
  },
  slotList: {
    gap: spacing.md,
  },
  slotCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.outlineVariant,
    borderRadius: 10,
    padding: spacing.md,
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  slotCardDone: {
    backgroundColor: colors.surfaceContainerLow,
  },
  slotHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  slotIndex: {
    fontFamily: typography.serif.fontFamily,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.5,
    color: colors.onSurface,
    width: 32,
  },
  slotHeaderText: {
    flex: 1,
    gap: 2,
  },
  slotLabel: {
    fontFamily: typography.label.fontFamily,
    fontSize: 12,
    letterSpacing: 1.6,
    color: colors.onSurface,
  },
  slotDescription: {
    fontFamily: typography.body.fontFamily,
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurfaceVariant,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotIdle: {
    backgroundColor: colors.outline,
  },
  statusDotPending: {
    backgroundColor: '#E8A23A',
  },
  statusDotDone: {
    backgroundColor: '#2E7D32',
  },
  statusText: {
    fontFamily: typography.label.fontFamily,
    fontSize: 9,
    letterSpacing: 1.2,
    color: colors.onSurfaceVariant,
  },
  previewRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  previewImage: {
    width: 96,
    height: 96,
    borderRadius: 6,
    backgroundColor: colors.surfaceContainer,
  },
  previewMeta: {
    flex: 1,
    gap: 2,
  },
  metaLabel: {
    fontFamily: typography.label.fontFamily,
    fontSize: 9,
    letterSpacing: 1.2,
    color: colors.onSurfaceVariant,
    marginTop: 4,
  },
  metaValue: {
    fontFamily: typography.body.fontFamily,
    fontSize: 13,
    color: colors.onSurface,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  captureButton: {
    flex: 1,
    minHeight: 60,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  captureIcon: {
    fontFamily: typography.serif.fontFamily,
    fontSize: 22,
    color: colors.onSurface,
  },
  captureLabel: {
    fontFamily: typography.label.fontFamily,
    fontSize: 10,
    letterSpacing: 1.4,
    color: colors.onSurface,
  },
  secondaryAction: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    fontFamily: typography.label.fontFamily,
    fontSize: 10,
    letterSpacing: 1.2,
    color: colors.onSurface,
  },
  primaryAction: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 999,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionInner: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  primaryActionText: {
    fontFamily: typography.label.fontFamily,
    fontSize: 11,
    letterSpacing: 1.4,
    color: colors.onInk,
  },
  actionPressed: {
    opacity: 0.85,
  },
  disabledAction: {
    opacity: 0.5,
  },
  submitWrap: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  submitHint: {
    fontFamily: typography.body.fontFamily,
    fontSize: 12,
    lineHeight: 18,
    color: colors.onSurfaceVariant,
    fontStyle: 'italic',
  },
  lockedNote: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outlineVariant,
    gap: spacing.sm,
  },
  lockedBody: {
    fontFamily: typography.body.fontFamily,
    fontSize: 13,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
  },
});
