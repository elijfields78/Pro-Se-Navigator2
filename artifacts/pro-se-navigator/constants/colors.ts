/**
 * Pro Se Navigator — design tokens
 *
 * "Counsel Dark" art direction: deep atmospheric dark mode, electro-jade
 * primary, amber CTAs. The light palette is kept exactly as-is for a future
 * theme toggle; the app currently renders dark everywhere (see useColors).
 */

const colors = {
  light: {
    // Surfaces
    background: '#FAF9F5',
    surface: '#FFFFFF',
    surface2: '#F5F4F0',
    surfaceOffset: '#EFEEE9',

    // Text
    text: '#1C1B18',
    textSecondary: '#6B6A63',
    textMuted: '#9A988F',

    // Borders
    border: '#EAE8E1',
    borderStrong: '#DBD9D0',

    // Brand — teal (ivory + teal identity)
    primary: '#0D9488',
    primaryGuide: '#14B8A6',
    primaryGlow: 'rgba(13,148,136,0.14)',
    primaryDim: 'rgba(13,148,136,0.07)',

    // CTA
    amber: '#E8A33D',
    amberText: '#412402',
    amberGlow: 'rgba(232,163,61,0.25)',

    // Semantic states
    verifiedBg: '#DFF3F0',
    verifiedText: '#0D9488',
    deadlineBg: '#FAEEDA',
    deadlineText: '#854F0B',

    // Legacy aliases for scaffold compatibility
    tint: '#0D9488',
    foreground: '#1C1B18',
    card: '#FFFFFF',
    cardForeground: '#1C1B18',
    muted: '#F5F4F0',
    mutedForeground: '#9A988F',
    accent: '#DFF3F0',
    accentForeground: '#0D9488',
    destructive: '#DC2626',
    destructiveForeground: '#FFFFFF',
    input: '#EAE8E1',
    primary2: '#0D9488',
    primaryForeground: '#FFFFFF',
    secondary: '#F5F4F0',
    secondaryForeground: '#1C1B18',
  },

  dark: {
    // Surfaces
    background: '#0E1117',
    surface: '#161B25',
    surface2: '#1E2537',
    surfaceOffset: '#252D3D',

    // Text
    text: '#E8EBF0',
    textSecondary: '#8892A4',
    textMuted: '#4D5568',

    // Borders
    border: 'rgba(255,255,255,0.08)',
    borderStrong: 'rgba(255,255,255,0.14)',

    // Brand — electro-jade
    primary: '#00D4A0',
    primaryGuide: '#33E0B5',
    primaryGlow: 'rgba(0,212,160,0.18)',
    primaryDim: 'rgba(0,212,160,0.08)',

    // CTA
    amber: '#E8A33D',
    amberText: '#1A0D00',
    amberGlow: 'rgba(232,163,61,0.25)',

    // Semantic states
    verifiedBg: 'rgba(0,212,160,0.10)',
    verifiedText: '#00D4A0',
    deadlineBg: 'rgba(232,163,61,0.12)',
    deadlineText: '#F0B55A',

    // Legacy aliases for scaffold compatibility
    tint: '#00D4A0',
    foreground: '#E8EBF0',
    card: '#161B25',
    cardForeground: '#E8EBF0',
    muted: '#1E2537',
    mutedForeground: '#8892A4',
    accent: 'rgba(0,212,160,0.10)',
    accentForeground: '#00D4A0',
    destructive: '#FF5252',
    destructiveForeground: '#FFFFFF',
    input: '#252D3D',
    primary2: '#00D4A0',
    primaryForeground: '#001A13',
    secondary: '#1E2537',
    secondaryForeground: '#E8EBF0',
  },

  radius: 14,
};

export default colors;
