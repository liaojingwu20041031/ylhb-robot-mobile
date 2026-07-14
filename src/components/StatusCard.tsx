import { StyleSheet, Text, View } from 'react-native';
import { colors, ConsoleTone, radius, toneColors } from '../theme/consoleTheme';
import { stateTone } from '../utils/status';
import { displayState } from '../utils/displayText';

type Props = {
  title: string;
  value?: string | number | boolean | null;
  tone?: ConsoleTone;
  note?: string;
  technicalLabel?: string;
};

export function StatusCard({ title, value, tone, note, technicalLabel }: Props) {
  const display = displayState(value);
  const resolvedTone = tone ?? stateTone(typeof value === 'boolean' ? value : String(value ?? ''));
  const palette = toneColors[resolvedTone];
  return (
    <View style={styles.card} accessibilityLiveRegion="polite">
      <View style={[styles.dot, { backgroundColor: palette.border }]} />
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={[styles.value, { color: palette.fg }]} selectable>{display}</Text>
        {technicalLabel ? <Text style={styles.technical} selectable>{technicalLabel}</Text> : null}
        {note ? <Text style={styles.note}>{note}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 150,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.panel,
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
  },
  content: {
    flex: 1,
    gap: 3,
  },
  title: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  value: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  note: {
    color: colors.textSubtle,
    fontSize: 11,
    lineHeight: 15,
  },
  technical: {
    color: colors.textSubtle,
    fontSize: 11,
  },
});
