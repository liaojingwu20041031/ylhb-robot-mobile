import { PropsWithChildren, ReactElement } from 'react';
import { RefreshControlProps, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/consoleTheme';
import { GlobalSafetyBar } from './GlobalSafetyBar';

type Props = PropsWithChildren<{
  title: string;
  subtitle?: string;
  showSafetyBar?: boolean;
  refreshControl?: ReactElement<RefreshControlProps>;
}>;

export function PageContainer({ title, subtitle, showSafetyBar = false, refreshControl, children }: Props) {
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} refreshControl={refreshControl}>
      <View style={styles.header}>
        <View style={styles.heading}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {showSafetyBar ? <GlobalSafetyBar /> : null}
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
    backgroundColor: colors.bg,
    minHeight: '100%',
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
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
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
});
