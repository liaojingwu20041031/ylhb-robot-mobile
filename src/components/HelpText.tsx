import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, ConsoleTone, radius, toneColors } from '../theme/consoleTheme';

type Props = {
  children: ReactNode;
  tone?: ConsoleTone;
};

export function HelpText({ children, tone = 'info' }: Props) {
  const palette = toneColors[tone];
  return (
    <View style={[styles.box, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <Text style={[styles.text, { color: tone === 'neutral' ? colors.textMuted : palette.fg }]} selectable>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 10,
  },
  text: {
    fontSize: 13,
    lineHeight: 19,
  },
});