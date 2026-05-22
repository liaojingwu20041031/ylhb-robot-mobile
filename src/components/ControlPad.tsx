import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { robotActions } from '../store/robotStore';

const DURATION_MS = 300;

function command(linear_x: number, angular_z: number) {
  return robotActions.sendVelocity({ linear_x, angular_z, duration_ms: DURATION_MS });
}

export function ControlPad() {
  return (
    <View style={styles.panel}>
      <Text style={styles.notice}>每次点击只发送 300ms 短时速度命令。</Text>
      <TouchableOpacity style={styles.button} onPress={() => command(0.03, 0)}>
        <Text style={styles.buttonText}>前进</Text>
      </TouchableOpacity>
      <View style={styles.row}>
        <TouchableOpacity style={styles.button} onPress={() => command(0, 0.15)}>
          <Text style={styles.buttonText}>左转</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.stop} onPress={() => robotActions.stop()}>
          <Text style={styles.stopText}>停止</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => command(0, -0.15)}>
          <Text style={styles.buttonText}>右转</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.button} onPress={() => command(-0.03, 0)}>
        <Text style={styles.buttonText}>后退</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.estop} onPress={() => robotActions.stop()}>
        <Text style={styles.estopText}>急停</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: 12,
    alignItems: 'stretch',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  notice: {
    color: '#8a6d1d',
    backgroundColor: '#fff8c5',
    borderColor: '#d29922',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  button: {
    flex: 1,
    minHeight: 56,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1f6feb',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  stop: {
    flex: 1,
    minHeight: 56,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#57606a',
  },
  stopText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  estop: {
    minHeight: 64,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#cf222e',
  },
  estopText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },
});
