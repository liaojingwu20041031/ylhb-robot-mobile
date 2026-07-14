import { PropsWithChildren, ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radius } from '../theme/consoleTheme';

type Variant = 'primary' | 'secondary' | 'warning' | 'danger' | 'ghost';

type Props = PropsWithChildren<{
  label?: string;
  icon?: ReactNode;
  description?: string;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}>;

export function AppButton({
  label,
  icon,
  description,
  variant = 'primary',
  disabled = false,
  loading = false,
  onPress,
  style,
  children,
  accessibilityLabel,
  accessibilityHint,
}: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      hitSlop={6}
      android_ripple={{ color: 'rgba(255,255,255,0.18)', borderless: false }}
      style={({ pressed }) => [styles.base, styles[variant], isDisabled && styles.disabled, pressed && !isDisabled && styles.pressed, style]}
    >
      <View style={styles.labelRow}>
        {loading ? <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? '#FFFFFF' : colors.primary} /> : icon}
        <Text style={[styles.label, styles[`${variant}Text`]]}>{label ?? children}</Text>
      </View>
      {description ? (
        <Text style={[styles.description, (variant === 'primary' || variant === 'danger') && styles.invertedDescription]}>
          {description}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
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
    opacity: 0.58,
  },
  pressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.9,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
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
  primaryText: {
    color: '#FFFFFF',
  },
  dangerText: {
    color: '#FFFFFF',
  },
  secondaryText: {
    color: colors.primary,
  },
  warningText: {
    color: '#92400E',
  },
  ghostText: {
    color: colors.textMuted,
  },
  ghostDescription: {
    color: colors.textSubtle,
  },
  invertedDescription: {
    color: 'rgba(255,255,255,0.82)',
  },
});
