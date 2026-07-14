export const colors = {
  bg: '#F4F7FB',
  bgElevated: '#F8FAFC',
  panel: '#FFFFFF',
  panelSoft: '#F8FAFC',
  border: '#E6EAF0',
  borderStrong: '#CBD5E1',
  text: '#172033',
  textMuted: '#667085',
  textSubtle: '#98A2B3',
  primary: '#2563EB',
  primarySoft: '#EAF2FF',
  success: '#16a34a',
  successSoft: '#dcfce7',
  warning: '#ca8a04',
  warningSoft: '#fef3c7',
  danger: '#dc2626',
  dangerSoft: '#fee2e2',
  neutral: '#64748B',
  neutralSoft: '#F1F5F9',
  input: '#FFFFFF',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
};

export const radius = {
  sm: 12,
  md: 16,
  lg: 20,
};

export const typography = {
  title: 28,
  section: 18,
  body: 14,
  small: 12,
  tiny: 11,
};

export type ConsoleTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'stale';

export const toneColors: Record<ConsoleTone, { fg: string; bg: string; border: string }> = {
  success: { fg: '#166534', bg: colors.successSoft, border: '#86EFAC' },
  warning: { fg: '#92400E', bg: colors.warningSoft, border: '#FCD34D' },
  danger: { fg: '#991B1B', bg: colors.dangerSoft, border: '#FCA5A5' },
  info: { fg: '#1D4ED8', bg: colors.primarySoft, border: '#BFDBFE' },
  neutral: { fg: '#475569', bg: colors.neutralSoft, border: '#CBD5E1' },
  stale: { fg: '#57534E', bg: '#F5F5F4', border: '#D6D3D1' },
};
