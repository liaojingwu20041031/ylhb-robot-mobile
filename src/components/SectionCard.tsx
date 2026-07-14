import { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme/consoleTheme';

type Props = PropsWithChildren<{
  title: string;
  description?: string;
  summary?: ReactNode;
  actions?: ReactNode;
}>;

export function SectionCard({ title, description, summary, actions, children }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.heading}>
          <Text style={styles.title}>{title}</Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}
        </View>
        {summary ? <View style={styles.summary}>{summary}</View> : null}
      </View>
      {children ? <View style={styles.body}>{children}</View> : null}
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 16,
    gap: 12,
    elevation: 1,
    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap',
  },
  heading: {
    flex: 1,
    minWidth: 180,
    gap: 4,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  description: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  summary: {
    alignItems: 'flex-start',
  },
  body: {
    gap: 10,
  },
  actions: {
    gap: 8,
  },
});
