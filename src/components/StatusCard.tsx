import { StyleSheet, Text, View } from 'react-native';

type Props = {
  title: string;
  value?: string | number | boolean;
  tone?: 'normal' | 'ok' | 'warn' | 'error';
};

export function StatusCard({ title, value = '-', tone = 'normal' }: Props) {
  return (
    <View style={[styles.card, styles[tone]]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.value}>{String(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '47%',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d0d7de',
    backgroundColor: '#fff',
  },
  title: {
    color: '#667085',
    fontSize: 12,
  },
  value: {
    marginTop: 6,
    color: '#17202a',
    fontSize: 16,
    fontWeight: '700',
  },
  normal: {},
  ok: {
    borderColor: '#1f883d',
  },
  warn: {
    borderColor: '#d29922',
  },
  error: {
    borderColor: '#cf222e',
  },
});
