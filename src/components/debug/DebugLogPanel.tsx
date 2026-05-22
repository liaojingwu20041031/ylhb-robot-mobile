import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LogPanel } from '../LogPanel';
import { robotActions, useRobotStore } from '../../store/robotStore';

export function DebugLogPanel() {
  const logs = useRobotStore((snapshot) => snapshot.logs);
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>调试日志</Text>
        <TouchableOpacity style={styles.clear} onPress={() => robotActions.clearLogs()}>
          <Text style={styles.clearText}>清空</Text>
        </TouchableOpacity>
      </View>
      <LogPanel logs={logs.slice(0, 20)} filter="all" />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  clear: {
    backgroundColor: '#57606a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  clearText: {
    color: '#fff',
    fontWeight: '800',
  },
});
