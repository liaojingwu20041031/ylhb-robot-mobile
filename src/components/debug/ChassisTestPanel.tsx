import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { robotActions } from '../../store/robotStore';

const DURATION_MS = 300;

function test(mode: 'forward' | 'backward' | 'left' | 'right') {
  const preset = {
    forward: { linear_x: 0.03, angular_z: 0 },
    backward: { linear_x: -0.03, angular_z: 0 },
    left: { linear_x: 0, angular_z: 0.15 },
    right: { linear_x: 0, angular_z: -0.15 },
  }[mode];
  return robotActions.chassisTest({ mode, duration_ms: DURATION_MS, ...preset });
}

export function ChassisTestPanel() {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>底盘测试</Text>
      <Text style={styles.notice}>第一次测试请架空轮子，确认周围安全。</Text>
      <View style={styles.row}>
        <Button label="低速前进" onPress={() => test('forward')} />
        <Button label="低速后退" onPress={() => test('backward')} />
      </View>
      <View style={styles.row}>
        <Button label="左转" onPress={() => test('left')} />
        <Button label="右转" onPress={() => test('right')} />
      </View>
      <View style={styles.row}>
        <Button label="停止" onPress={() => robotActions.chassisStop()} neutral />
        <Button label="急停" onPress={() => robotActions.stop()} danger />
      </View>
    </View>
  );
}

function Button({
  label,
  onPress,
  danger,
  neutral,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
  neutral?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.button, neutral && styles.neutral, danger && styles.danger]}
      onPress={onPress}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d0d7de',
    backgroundColor: '#fff',
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  notice: {
    color: '#9a6700',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#0969da',
  },
  neutral: {
    backgroundColor: '#57606a',
  },
  danger: {
    backgroundColor: '#cf222e',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '800',
  },
});
