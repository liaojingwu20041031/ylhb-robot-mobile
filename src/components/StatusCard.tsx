import { StyleSheet, Text, View } from 'react-native';
import { colors, ConsoleTone, radius, toneColors } from '../theme/consoleTheme';
import { stateTone, textOrUnknown } from '../utils/status';
import { StatusBadge } from './StatusBadge';

type Props = {
  title: string;
  value?: string | number | boolean | null;
  tone?: ConsoleTone;
  note?: string;
};

export function StatusCard({ title, value, tone, note }: Props) {
  const display = textOrUnknown(value);
  const resolvedTone = tone ?? stateTone(typeof value === 'boolean' ? value : String(value ?? ''));
  const palette = toneColors[resolvedTone];
  return (
    <View style={[styles.card, { borderColor: palette.border }]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.value} selectable numberOfLines={3}>
        {display}
      </Text>
      {note ? <Text style={styles.note}>{note}</Text> : null}
      <StatusBadge label={display} tone={resolvedTone} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 142,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    backgroundColor: colors.panel,
    gap: 7,
  },
  title: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  value: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 21,
  },
  note: {
    color: colors.textSubtle,
    fontSize: 11,
    lineHeight: 15,
  },
});
