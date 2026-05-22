export const colors = {
  bg: '#071018',
  bgElevated: '#0d1824',
  panel: '#101d2a',
  panelSoft: '#142233',
  border: '#24384c',
  borderStrong: '#34516d',
  text: '#e6edf3',
  textMuted: '#9fb0c2',
  textSubtle: '#718196',
  primary: '#2f81f7',
  primarySoft: '#173b69',
  success: '#2ea043',
  successSoft: '#12351f',
  warning: '#d29922',
  warningSoft: '#3b2a12',
  danger: '#f85149',
  dangerSoft: '#3b1719',
  neutral: '#6e7681',
  neutralSoft: '#222b36',
  input: '#09131d',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
};

export const radius = {
  sm: 6,
  md: 8,
};

export const typography = {
  title: 24,
  section: 18,
  body: 14,
  small: 12,
  tiny: 11,
};

export type ConsoleTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'stale';

export const toneColors: Record<ConsoleTone, { fg: string; bg: string; border: string }> = {
  success: { fg: '#7ee787', bg: colors.successSoft, border: colors.success },
  warning: { fg: '#f2cc60', bg: colors.warningSoft, border: colors.warning },
  danger: { fg: '#ff938a', bg: colors.dangerSoft, border: colors.danger },
  info: { fg: '#79c0ff', bg: colors.primarySoft, border: colors.primary },
  neutral: { fg: '#c9d1d9', bg: colors.neutralSoft, border: colors.neutral },
  stale: { fg: '#a5adba', bg: '#1c222b', border: '#4b5563' },
};
