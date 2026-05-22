import { Link } from 'expo-router';
import { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/consoleTheme';
import { GlobalSafetyBar } from './GlobalSafetyBar';

type Props = PropsWithChildren<{
  title: string;
  subtitle?: string;
  showSafetyBar?: boolean;
}>;

export function PageContainer({ title, subtitle, showSafetyBar = true, children }: Props) {
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.heading}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        <Link href="/" style={styles.home}>
          首页
        </Link>
      </View>
      {showSafetyBar ? <GlobalSafetyBar /> : null}
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 14,
    gap: 14,
    backgroundColor: colors.bg,
    minHeight: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  heading: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.text,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  home: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.panelSoft,
    borderColor: colors.border,
    borderWidth: 1,
    color: colors.text,
    overflow: 'hidden',
    fontWeight: '800',
  },
});
