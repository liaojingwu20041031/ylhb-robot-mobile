import { StyleSheet, Text, TouchableOpacity } from 'react-native';

type Props = {
  label: string;
  onPress: () => void;
  danger?: boolean;
};

export function TaskButton({ label, onPress, danger = false }: Props) {
  return (
    <TouchableOpacity style={[styles.button, danger && styles.danger]} onPress={onPress}>
      <Text style={styles.text}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#0969da',
    alignItems: 'center',
  },
  danger: {
    backgroundColor: '#cf222e',
  },
  text: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
