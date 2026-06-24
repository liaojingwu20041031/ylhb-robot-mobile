export const colors = {
  bg: '#fff7ed',
  bgElevated: '#fffbf5',
  panel: '#ffffff',
  panelSoft: '#fff1dd',
  border: '#ead7c0',
  borderStrong: '#d6a15d',
  text: '#24160b',
  textMuted: '#6f5840',
  textSubtle: '#987d61',
  primary: '#d97706',
  primarySoft: '#ffedd5',
  success: '#16a34a',
  successSoft: '#dcfce7',
  warning: '#ca8a04',
  warningSoft: '#fef3c7',
  danger: '#dc2626',
  dangerSoft: '#fee2e2',
  neutral: '#78716c',
  neutralSoft: '#f5f5f4',
  input: '#fffaf2',
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
  success: { fg: '#166534', bg: colors.successSoft, border: colors.success },
  warning: { fg: '#854d0e', bg: colors.warningSoft, border: colors.warning },
  danger: { fg: '#991b1b', bg: colors.dangerSoft, border: colors.danger },
  info: { fg: '#92400e', bg: colors.primarySoft, border: colors.primary },
  neutral: { fg: '#44403c', bg: colors.neutralSoft, border: colors.neutral },
  stale: { fg: '#57534e', bg: '#f3eee7', border: '#a8a29e' },
};
