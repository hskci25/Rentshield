import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '../theme/tokens';

export type SideMenuTarget =
  | 'profile'
  | 'explore'
  | 'agreement'
  | 'movein';

export interface SideMenuSection {
  id: SideMenuTarget;
  label: string;
}

interface SideMenuProps {
  currentTarget: SideMenuTarget;
  onNavigate: (target: SideMenuTarget) => void;
}

const PANEL_WIDTH = 280;
const ANIMATION_MS = 260;
const HANDLE_HEIGHT = 72;

const SECTIONS: SideMenuSection[] = [
  { id: 'profile', label: 'PROFILE' },
  { id: 'explore', label: 'SEARCH PROPERTY' },
  { id: 'agreement', label: 'AGREEMENT REVIEW' },
  { id: 'movein', label: 'MOVE-IN DOCUMENTATION' },
];

export default function SideMenu({
  currentTarget,
  onNavigate,
}: SideMenuProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const handleTop = Math.max(
    insets.top + 80,
    Math.round(windowHeight / 2 - HANDLE_HEIGHT / 2),
  );
  const [isOpen, setIsOpen] = useState(false);
  const slideX = useRef(new Animated.Value(-PANEL_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideX, {
        toValue: isOpen ? 0 : -PANEL_WIDTH,
        duration: ANIMATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: isOpen ? 0.45 : 0,
        duration: ANIMATION_MS,
        useNativeDriver: true,
      }),
    ]).start();
  }, [backdropOpacity, isOpen, slideX]);

  const handleSelect = (target: SideMenuTarget) => {
    setIsOpen(false);
    if (target === currentTarget) {
      return;
    }
    // Brief delay so the close animation can start visibly before route change.
    setTimeout(() => {
      onNavigate(target);
    }, 80);
  };

  const handleOpacity = backdropOpacity.interpolate({
    inputRange: [0, 0.45],
    outputRange: [1, 0],
  });

  return (
    <>
      <Animated.View
        pointerEvents={isOpen ? 'auto' : 'none'}
        style={[
          StyleSheet.absoluteFillObject,
          styles.backdrop,
          { opacity: backdropOpacity },
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={() => setIsOpen(false)}
        />
      </Animated.View>

      <Animated.View
        pointerEvents={isOpen ? 'auto' : 'none'}
        style={[
          styles.panel,
          {
            paddingTop: insets.top + spacing.xl,
            paddingBottom: insets.bottom + spacing.lg,
            transform: [{ translateX: slideX }],
          },
        ]}
      >
        <Text style={styles.brandTitle}>RENTSHIELD</Text>
        <Text style={styles.brandSubtitle}>NAVIGATION</Text>
        <View style={styles.divider} />

        <View style={styles.sectionList}>
          {SECTIONS.map((section) => {
            const active = section.id === currentTarget;
            return (
              <Pressable
                key={section.id}
                onPress={() => handleSelect(section.id)}
                style={({ pressed }) => [
                  styles.section,
                  active && styles.sectionActive,
                  pressed && styles.sectionPressed,
                ]}
              >
                <Text
                  style={[
                    styles.sectionLabel,
                    active && styles.sectionLabelActive,
                  ]}
                >
                  {section.label}
                </Text>
                {active && <View style={styles.activeDot} />}
              </Pressable>
            );
          })}
        </View>
      </Animated.View>

      <Animated.View
        pointerEvents={isOpen ? 'none' : 'box-none'}
        style={[
          styles.handleWrap,
          {
            top: handleTop,
            opacity: handleOpacity,
          },
        ]}
      >
        <Pressable
          onPress={() => setIsOpen(true)}
          style={({ pressed }) => [
            styles.handle,
            pressed && styles.handlePressed,
          ]}
          hitSlop={{ top: 12, bottom: 12, left: 0, right: 12 }}
        >
          <Text style={styles.handleIcon}>{'\u2630'}</Text>
          <Text style={styles.handleLabel}>MENU</Text>
        </Pressable>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: '#000000',
  },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: PANEL_WIDTH,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 4, height: 0 },
    elevation: 6,
  },
  brandTitle: {
    fontFamily: typography.serif.fontFamily,
    fontSize: 26,
    letterSpacing: -0.5,
    color: colors.onSurface,
  },
  brandSubtitle: {
    fontFamily: typography.label.fontFamily,
    fontSize: 10,
    letterSpacing: 2,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.outlineVariant,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionList: {
    gap: spacing.sm,
  },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: 10,
  },
  sectionActive: {
    backgroundColor: colors.surfaceContainer,
  },
  sectionPressed: {
    opacity: 0.7,
  },
  sectionLabel: {
    fontFamily: typography.label.fontFamily,
    fontSize: 12,
    letterSpacing: 1.6,
    color: colors.onSurface,
  },
  sectionLabelActive: {
    color: colors.onSurface,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.ink,
  },
  handleWrap: {
    position: 'absolute',
    left: 0,
  },
  handle: {
    width: 40,
    height: HANDLE_HEIGHT,
    backgroundColor: colors.ink,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 3, height: 3 },
    elevation: 6,
  },
  handlePressed: {
    opacity: 0.8,
  },
  handleIcon: {
    fontSize: 18,
    color: colors.onInk,
    lineHeight: 20,
  },
  handleLabel: {
    fontFamily: typography.label.fontFamily,
    fontSize: 8,
    letterSpacing: 1.4,
    color: colors.onInk,
  },
});
