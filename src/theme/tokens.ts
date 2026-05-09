/**
 * Design tokens derived from the RentShield Editorial Fintech Stitch project.
 * Centralised so every screen pulls from one source of truth.
 */

export const colors = {
  // Warm, paper-like off-white used for the splash and primary surfaces.
  background: '#FAFAF7',
  surface: '#FCF8F8',
  surfaceContainerLow: '#F6F3F2',
  surfaceContainer: '#F1EDEC',

  // Editorial near-black used for the wordmark and headlines.
  onBackground: '#1C1B1B',
  onSurface: '#1C1B1B',

  // Warm muted gray for secondary metadata (the splash tagline).
  onSurfaceVariant: '#444748',

  // Hairline / divider rule used for the architectural accent.
  outline: '#747878',
  outlineVariant: '#C4C7C8',

  // Primary action ink (the "Get code" button on the login screen).
  ink: '#1A1A1A',
  onInk: '#FFFFFF',
} as const;

export const spacing = {
  hairline: 0.5,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const typography = {
  // The brand wordmark on splash uses Inter Bold with very wide tracking.
  wordmark: {
    fontFamily: 'Inter_700Bold',
    // 0.3em tracking on a ~32px glyph -> ~9.6px letter spacing.
    letterSpacing: 9.6,
  },
  // Tighter serif wordmark used in the in-app header (login screen).
  wordmarkHeader: {
    fontFamily: 'SourceSerif4_500Medium',
    letterSpacing: -0.48,
  },
  // Editorial serif used for the splash tagline and large display headlines.
  serif: {
    fontFamily: 'SourceSerif4_400Regular',
  },
  // Inter labels for eyebrows, buttons, and microcopy.
  label: {
    fontFamily: 'Inter_500Medium',
  },
  body: {
    fontFamily: 'Inter_400Regular',
  },
} as const;

export const motion = {
  // Master clock for the splash → login handoff (matches editorial pacing).
  splashEnter: 800,
  splashHold: 1200,
  splashExit: 700,
  loginEnter: 600,
} as const;
