import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Defs, Pattern, Path, Rect } from 'react-native-svg';

import { colors, motion, spacing, typography } from '../theme/tokens';

interface SplashScreenProps {
  /**
   * Fires after the wordmark has finished its exit animation
   * ("RENTSHIELD coming out of this screen").
   */
  onExitComplete?: () => void;
}

/**
 * RentShield splash screen.
 *
 * Plays a three-beat editorial sequence:
 *   1. Entrance — wordmark + tagline rise into place.
 *   2. Hold     — composition rests for a beat.
 *   3. Exit     — wordmark drifts upward and out, tagline fades down,
 *                 then `onExitComplete` is fired so the host can route
 *                 to the next screen.
 */
export function SplashScreen({
  onExitComplete,
}: SplashScreenProps): React.JSX.Element {
  const { width, height } = useWindowDimensions();

  const wordmarkOpacity = useRef(new Animated.Value(0)).current;
  const wordmarkTranslateY = useRef(new Animated.Value(20)).current;
  const wordmarkScale = useRef(new Animated.Value(0.96)).current;

  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(12)).current;

  const hairlineOpacity = useRef(new Animated.Value(0)).current;
  const hairlineScaleY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const enter = Animated.parallel([
      Animated.timing(wordmarkOpacity, {
        toValue: 1,
        duration: motion.splashEnter,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(wordmarkTranslateY, {
        toValue: 0,
        duration: motion.splashEnter,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(wordmarkScale, {
        toValue: 1,
        duration: motion.splashEnter,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(280),
        Animated.parallel([
          Animated.timing(taglineOpacity, {
            toValue: 1,
            duration: 600,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(taglineTranslateY, {
            toValue: 0,
            duration: 600,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]),
      Animated.sequence([
        Animated.delay(520),
        Animated.parallel([
          Animated.timing(hairlineOpacity, {
            toValue: 0.5,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(hairlineScaleY, {
            toValue: 1,
            duration: 500,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]);

    const exit = Animated.parallel([
      // Wordmark "comes out" — lifts up, scales slightly, fades to zero.
      Animated.timing(wordmarkTranslateY, {
        toValue: -36,
        duration: motion.splashExit,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(wordmarkScale, {
        toValue: 1.06,
        duration: motion.splashExit,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(wordmarkOpacity, {
        toValue: 0,
        duration: motion.splashExit,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      // Tagline drifts down and out a half-beat ahead of the wordmark.
      Animated.timing(taglineOpacity, {
        toValue: 0,
        duration: motion.splashExit - 200,
        useNativeDriver: true,
      }),
      Animated.timing(taglineTranslateY, {
        toValue: 8,
        duration: motion.splashExit - 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      // Hairline dissolves quietly.
      Animated.timing(hairlineOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]);

    const sequence = Animated.sequence([
      enter,
      Animated.delay(motion.splashHold),
      exit,
    ]);

    sequence.start(({ finished }) => {
      if (finished) {
        onExitComplete?.();
      }
    });

    return () => {
      sequence.stop();
    };
  }, [
    hairlineOpacity,
    hairlineScaleY,
    onExitComplete,
    taglineOpacity,
    taglineTranslateY,
    wordmarkOpacity,
    wordmarkScale,
    wordmarkTranslateY,
  ]);

  return (
    <View style={styles.root}>
      {/* Background blueprint grid — extremely faint paper texture. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width={width} height={height} style={styles.gridSvg}>
          <Defs>
            <Pattern
              id="grid"
              width={40}
              height={40}
              patternUnits="userSpaceOnUse"
            >
              <Path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke={colors.onBackground}
                strokeWidth={0.5}
              />
            </Pattern>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#grid)" />
        </Svg>
      </View>

      {/* Centered wordmark cluster. */}
      <View style={styles.wordmarkCluster} pointerEvents="none">
        <Animated.Text
          accessibilityRole="header"
          allowFontScaling={false}
          style={[
            styles.wordmark,
            {
              opacity: wordmarkOpacity,
              transform: [
                { translateY: wordmarkTranslateY },
                { scale: wordmarkScale },
              ],
            },
          ]}
        >
          RENTSHIELD
        </Animated.Text>
        <Animated.Text
          allowFontScaling={false}
          style={[
            styles.tagline,
            {
              opacity: taglineOpacity,
              transform: [{ translateY: taglineTranslateY }],
            },
          ]}
        >
          PREMIUM RENTAL PROTECTION
        </Animated.Text>
      </View>

      {/* Architectural hairline anchor near the bottom. */}
      <Animated.View
        style={[
          styles.hairline,
          {
            opacity: hairlineOpacity,
            transform: [{ scaleY: hairlineScaleY }],
          },
        ]}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  gridSvg: {
    opacity: 0.02,
  },
  wordmarkCluster: {
    alignItems: 'center',
    // Visual offset shifts the cluster a hair above optical centre,
    // matching the editorial composition in the Stitch screenshot.
    transform: [{ translateY: -8 }],
  },
  wordmark: {
    fontFamily: typography.wordmark.fontFamily,
    color: colors.onBackground,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: typography.wordmark.letterSpacing,
    marginLeft: typography.wordmark.letterSpacing,
    textAlign: 'center',
    ...Platform.select({
      android: { includeFontPadding: false as const },
    }),
  },
  tagline: {
    fontFamily: typography.serif.fontFamily,
    color: colors.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.2,
    marginTop: spacing.md,
    marginLeft: 1.2,
    textAlign: 'center',
  },
  hairline: {
    position: 'absolute',
    bottom: spacing.xxl,
    width: spacing.hairline,
    height: 64,
    backgroundColor: colors.outlineVariant,
  },
});

export default SplashScreen;
