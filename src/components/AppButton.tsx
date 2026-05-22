import { PropsWithChildren } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { colors, radius } from '../theme/consoleTheme';

type Variant = 'primary' | 'secondary' | 'warning' | 'danger' | 'ghost';

type Props = PropsWithChildren<{
  label?: string;
  description?: string;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}>;

export function AppButton({
  label,
  description,
  variant = 'primary',
  disabled = false,
  loading = false,
  onPress,
  style,
  children,
}: Props) {
  const isDisabled = disabled || loading;
  return (
    <TouchableOpacity
      activeOpacity={0.78}
      disabled={isDisabled}
      onPress={onPress}
      style={[styles.base, styles[variant], isDisabled && styles.disabled, style]}
    >
      {loading ? <ActivityIndicator color={variant === 'ghost' ? colors.textMuted : colors.text} /> : null}
      <Text style={[styles.label, variant === 'ghost' && styles.ghostText]} numberOfLines={2}>
        {label ?? children}
      </Text>
      {description ? (
        <Text style={[styles.description, variant === 'ghost' && styles.ghostDescription]} numberOfLines={3}>
          {description}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.panelSoft,
    borderColor: colors.borderStrong,
  },
  warning: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.warning,
  },
  danger: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: colors.border,
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  description: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
  },
  ghostText: {
    color: colors.text,
  },
  ghostDescription: {
    color: colors.textSubtle,
  },
});
