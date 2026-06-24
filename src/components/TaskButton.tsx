import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/consoleTheme';
import { AppButton } from './AppButton';

type Props = {
  label: string;
  commandText: string;
  topic?: string;
  onPress: () => void;
  danger?: boolean;
  warning?: boolean;
  loading?: boolean;
};

export function TaskButton({
  label,
  commandText,
  topic = '/inspection_ai/text_command',
  onPress,
  danger = false,
  warning = false,
  loading = false,
}: Props) {
  return (
    <View style={styles.card}>
      <AppButton
        label={label}
        variant={danger ? 'danger' : warning ? 'warning' : 'primary'}
        onPress={onPress}
        loading={loading}
      />
      <Text style={styles.meta} selectable>将发送：{commandText}</Text>
      <Text style={styles.topic} selectable>话题：{topic}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 150,
    gap: 7,
    padding: 10,
    borderRadius: 8,
    backgroundColor: colors.bgElevated,
    borderColor: colors.border,
    borderWidth: 1,
  },
  meta: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 17,
  },
  topic: {
    color: colors.textSubtle,
    fontSize: 11,
    lineHeight: 15,
  },
});
