import { StyleSheet, Text, View } from 'react-native';
import { ConsoleTone, radius, toneColors } from '../theme/consoleTheme';

type Props = {
  label: string;
  tone?: ConsoleTone;
};

export function StatusBadge({ label, tone = 'neutral' }: Props) {
  const palette = toneColors[tone];
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <Text style={[styles.text, { color: palette.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  text: {
    fontSize: 12,
    fontWeight: '800',
  },
});
