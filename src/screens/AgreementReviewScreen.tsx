import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
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
  AgreementAnalysis,
  AgreementImage,
  AgreementReviewError,
  ClauseFlag,
  analyzeAgreementImages,
} from '../api/agreementReview';
import { colors, spacing, typography } from '../theme/tokens';

interface CapturedImage {
  id: string;
  uri: string;
  base64: string;
  mimeType: AgreementImage['mimeType'];
  width: number;
  height: number;
}

const SEVERITY_COLOR: Record<ClauseFlag['severity'], string> = {
  high: '#BA1A1A',
  medium: '#E8A23A',
  low: colors.ink,
};

const SEVERITY_LABEL: Record<ClauseFlag['severity'], string> = {
  high: 'HIGH',
  medium: 'MEDIUM',
  low: 'STANDARD',
};

const HERO_IMAGE_URI =
  'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?auto=format&fit=crop&w=1200&q=70';

const MAX_IMAGES = 2;

function inferMimeType(
  asset: ImagePicker.ImagePickerAsset,
): AgreementImage['mimeType'] {
  const declared = asset.mimeType?.toLowerCase();
  if (
    declared === 'image/jpeg' ||
    declared === 'image/png' ||
    declared === 'image/webp' ||
    declared === 'image/gif'
  ) {
    return declared;
  }
  const ext = asset.uri.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  return 'image/jpeg';
}

function generateImageId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function AgreementReviewScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [images, setImages] = useState<CapturedImage[]>([]);
  const [analysis, setAnalysis] = useState<AgreementAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCapture, setShowCapture] = useState(true);

  const hasAnalysis = analysis !== null;
  const topFlag = analysis?.flags[0];

  function pushAsset(asset: ImagePicker.ImagePickerAsset) {
    if (!asset.base64) return;
    setImages((prev) => {
      if (prev.length >= MAX_IMAGES) return prev;
      return [
        ...prev,
        {
          id: generateImageId(),
          uri: asset.uri,
          base64: asset.base64 as string,
          mimeType: inferMimeType(asset),
          width: asset.width,
          height: asset.height,
        },
      ];
    });
  }

  function removeImage(id: string) {
    setImages((prev) => prev.filter((image) => image.id !== id));
  }

  async function handleTakePhoto() {
    setError(null);
    if (images.length >= MAX_IMAGES) {
      setError(`You can attach up to ${MAX_IMAGES} pages per review.`);
      return;
    }
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Camera permission required',
        'Enable camera access in Settings to capture agreement photos.',
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.7,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      pushAsset(result.assets[0]);
    }
  }

  async function handleChooseLibrary() {
    setError(null);
    if (images.length >= MAX_IMAGES) {
      setError(`You can attach up to ${MAX_IMAGES} pages per review.`);
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Photo access required',
        'Enable photo access in Settings to attach agreement images.',
      );
      return;
    }
    const remaining = MAX_IMAGES - images.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      base64: true,
      quality: 0.7,
    });
    if (!result.canceled) {
      result.assets.slice(0, remaining).forEach(pushAsset);
    }
  }

  async function handleAnalyze() {
    if (images.length === 0) {
      setError('Add at least one photo of the agreement.');
      return;
    }
    setError(null);
    setAnalyzing(true);
    try {
      const payload: AgreementImage[] = images.map((image) => ({
        base64: image.base64,
        mimeType: image.mimeType,
      }));
      const result = await analyzeAgreementImages(payload);
      setAnalysis(result);
      setShowCapture(false);
    } catch (err) {
      if (err instanceof AgreementReviewError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unexpected error analysing the agreement.');
      }
    } finally {
      setAnalyzing(false);
    }
  }

  function handleStartOver() {
    setImages([]);
    setAnalysis(null);
    setError(null);
    setShowCapture(true);
  }

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.headerSide} />
        <Text style={styles.headerTitle}>REVIEW · DRAFT 1</Text>
        <Pressable
          onPress={() => setShowCapture((prev) => !prev)}
          hitSlop={8}
          style={styles.headerSideRight}
        >
          <Text style={styles.headerAction}>
            {showCapture ? (hasAnalysis ? 'CLOSE' : '') : 'EDIT'}
          </Text>
        </Pressable>
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
          <Text style={styles.eyebrow}>FAIRNESS</Text>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreNumber}>
              {hasAnalysis ? analysis!.score : '--'}
            </Text>
            <Text style={styles.scoreUnit}>/ 100</Text>
          </View>
          <Text style={styles.heroTagline}>
            {hasAnalysis
              ? analysis!.summary ||
                'Review the flagged clauses below before signing.'
              : 'Snap your rental agreement and let Claude flag every risky clause against Karnataka rental practice.'}
          </Text>
        </View>

        <View style={styles.divider} />

        {(showCapture || !hasAnalysis) && (
          <View style={styles.captureSection}>
            <Text style={styles.eyebrow}>AGREEMENT PAGES</Text>

            <View style={styles.captureButtons}>
              <Pressable
                style={({ pressed }) => [
                  styles.captureButton,
                  pressed && styles.actionPressed,
                  analyzing && styles.disabledAction,
                ]}
                onPress={handleTakePhoto}
                disabled={analyzing}
              >
                <Text style={styles.captureIcon}>＋</Text>
                <View style={styles.captureLabels}>
                  <Text style={styles.captureLabel}>TAKE PHOTO</Text>
                  <Text style={styles.captureSublabel}>Use the camera</Text>
                </View>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.captureButton,
                  pressed && styles.actionPressed,
                  analyzing && styles.disabledAction,
                ]}
                onPress={handleChooseLibrary}
                disabled={analyzing}
              >
                <Text style={styles.captureIcon}>▢</Text>
                <View style={styles.captureLabels}>
                  <Text style={styles.captureLabel}>FROM LIBRARY</Text>
                  <Text style={styles.captureSublabel}>
                    Select up to {MAX_IMAGES} pages
                  </Text>
                </View>
              </Pressable>
            </View>

            {images.length > 0 ? (
              <View style={styles.thumbnailGrid}>
                {images.map((image, index) => (
                  <View key={image.id} style={styles.thumbnailWrap}>
                    <Image
                      source={{ uri: image.uri }}
                      style={styles.thumbnail}
                      resizeMode="cover"
                    />
                    <View style={styles.thumbnailIndex}>
                      <Text style={styles.thumbnailIndexText}>
                        {String(index + 1).padStart(2, '0')}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => removeImage(image.id)}
                      hitSlop={6}
                      style={styles.thumbnailRemove}
                      disabled={analyzing}
                    >
                      <Text style={styles.thumbnailRemoveText}>×</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyHint}>
                No pages attached yet. Capture or upload your agreement pages
                above.
              </Text>
            )}

            {error && <Text style={styles.errorText}>{error}</Text>}

            <View style={styles.captureActions}>
              {hasAnalysis && (
                <Pressable
                  style={({ pressed }) => [
                    styles.secondaryAction,
                    pressed && styles.actionPressed,
                  ]}
                  onPress={handleStartOver}
                  disabled={analyzing}
                >
                  <Text style={styles.secondaryActionText}>START OVER</Text>
                </Pressable>
              )}

              <Pressable
                style={({ pressed }) => [
                  styles.primaryAction,
                  pressed && styles.actionPressed,
                  (analyzing || images.length === 0) && styles.disabledAction,
                ]}
                onPress={handleAnalyze}
                disabled={analyzing || images.length === 0}
              >
                {analyzing ? (
                  <View style={styles.primaryActionInner}>
                    <ActivityIndicator size="small" color={colors.onInk} />
                    <Text style={styles.primaryActionText}>ANALYSING</Text>
                  </View>
                ) : (
                  <Text style={styles.primaryActionText}>
                    {hasAnalysis ? 'RE-ANALYSE' : 'ANALYSE'}
                  </Text>
                )}
              </Pressable>
            </View>

            <View style={styles.divider} />
          </View>
        )}

        {hasAnalysis && analysis!.flags.length > 0 && (
          <View style={styles.clauseList}>
            <Text style={styles.eyebrow}>FLAGGED CLAUSES</Text>
            {analysis!.flags.map((flag) => (
              <View key={flag.id} style={styles.clauseItem}>
                <View style={styles.clauseRow}>
                  <Text style={styles.clauseTitle}>{flag.title}</Text>
                  <View
                    style={[
                      styles.severityDot,
                      { backgroundColor: SEVERITY_COLOR[flag.severity] },
                    ]}
                  />
                </View>
                {flag.excerpt ? (
                  <Text style={styles.clauseExcerpt}>“{flag.excerpt}”</Text>
                ) : null}
                <Text style={styles.clauseDescription}>{flag.explanation}</Text>
                {flag.suggestion ? (
                  <Text style={styles.clauseSuggestion}>
                    Negotiation: {flag.suggestion}
                  </Text>
                ) : null}
                <Text
                  style={getSeverityStyle(flag.severity)}
                >
                  {SEVERITY_LABEL[flag.severity]}
                </Text>
              </View>
            ))}
          </View>
        )}

        {hasAnalysis && analysis!.flags.length === 0 && (
          <View style={styles.clauseList}>
            <Text style={styles.eyebrow}>NO RED FLAGS</Text>
            <Text style={styles.clauseDescription}>
              Claude did not detect any high-risk clauses. Review the agreement
              once more before signing and confirm with your advisor.
            </Text>
          </View>
        )}

        {hasAnalysis && (
          <View style={styles.editorialSection}>
            <Image
              source={{ uri: HERO_IMAGE_URI }}
              style={styles.editorialImage}
              resizeMode="cover"
            />
            <View style={styles.editorialColumns}>
              <View style={styles.editorialColumn}>
                <Text style={styles.eyebrow}>LEGAL CONTEXT</Text>
                <Text style={styles.editorialBody}>
                  {analysis!.legalContext ||
                    (topFlag
                      ? `The Model Tenancy Act suggests that ${topFlag.explanation.toLowerCase()}`
                      : 'No significant legal red flags. Verify with a qualified advisor before execution.')}
                </Text>
              </View>
              <View style={styles.editorialColumn}>
                <Text style={styles.eyebrow}>RECOMMENDATION</Text>
                <Text style={styles.editorialBody}>
                  {analysis!.recommendation ||
                    topFlag?.suggestion ||
                    'Proceed with execution. Retain a signed copy and ensure registration where required.'}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function getSeverityStyle(level: ClauseFlag['severity']) {
  return {
    fontFamily: typography.label.fontFamily,
    fontSize: 9,
    letterSpacing: 1.2,
    color:
      level === 'high'
        ? '#B3261E'
        : level === 'medium'
          ? '#8A5D00'
          : colors.onSurfaceVariant,
  } as const;
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
  },
  headerSideRight: {
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
  headerAction: {
    fontFamily: typography.label.fontFamily,
    fontSize: 10,
    letterSpacing: 1.4,
    color: colors.onSurface,
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
  captureSection: {
    gap: spacing.md,
  },
  captureButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  captureButton: {
    flex: 1,
    minHeight: 92,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.outlineVariant,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  captureIcon: {
    fontFamily: typography.serif.fontFamily,
    fontSize: 28,
    color: colors.onSurface,
  },
  captureLabels: {
    gap: 2,
  },
  captureLabel: {
    fontFamily: typography.label.fontFamily,
    fontSize: 11,
    letterSpacing: 1.4,
    color: colors.onSurface,
  },
  captureSublabel: {
    fontFamily: typography.body.fontFamily,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  thumbnailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  thumbnailWrap: {
    width: 88,
    height: 112,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainer,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailIndex: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  thumbnailIndexText: {
    fontFamily: typography.label.fontFamily,
    fontSize: 9,
    letterSpacing: 1.2,
    color: '#FFFFFF',
  },
  thumbnailRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailRemoveText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 18,
  },
  emptyHint: {
    fontFamily: typography.body.fontFamily,
    fontSize: 13,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
  },
  errorText: {
    fontFamily: typography.body.fontFamily,
    fontSize: 13,
    lineHeight: 20,
    color: '#B3261E',
  },
  captureActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  secondaryAction: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surface,
  },
  secondaryActionText: {
    fontFamily: typography.label.fontFamily,
    fontSize: 10,
    letterSpacing: 1.2,
    color: colors.onSurface,
  },
  primaryAction: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
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
    fontSize: 10,
    letterSpacing: 1.2,
    color: colors.onInk,
  },
  actionPressed: {
    opacity: 0.85,
  },
  disabledAction: {
    opacity: 0.5,
  },
  clauseList: {
    gap: spacing.lg,
  },
  clauseItem: {
    gap: spacing.xs,
  },
  clauseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clauseTitle: {
    flex: 1,
    fontFamily: typography.body.fontFamily,
    fontSize: 16,
    lineHeight: 24,
    color: colors.onBackground,
    fontWeight: '500',
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: spacing.sm,
  },
  clauseExcerpt: {
    fontFamily: typography.serif.fontFamily,
    fontSize: 14,
    lineHeight: 22,
    color: colors.onSurface,
    fontStyle: 'italic',
  },
  clauseDescription: {
    fontFamily: typography.body.fontFamily,
    fontSize: 13,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
  },
  clauseSuggestion: {
    fontFamily: typography.body.fontFamily,
    fontSize: 13,
    lineHeight: 20,
    color: colors.onSurface,
  },
  editorialSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outlineVariant,
    gap: spacing.lg,
  },
  editorialImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: colors.surfaceContainerLow,
  },
  editorialColumns: {
    gap: spacing.lg,
  },
  editorialColumn: {
    gap: spacing.sm,
  },
  editorialBody: {
    fontFamily: typography.body.fontFamily,
    fontSize: 13,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
  },
});
