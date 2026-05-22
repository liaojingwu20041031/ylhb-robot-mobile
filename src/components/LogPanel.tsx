import { StyleSheet, Text, View } from 'react-native';
import { AppLog, AppLogType } from '../api/types';

type Props = {
  logs: AppLog[];
  filter?: AppLogType | 'all';
};

export function LogPanel({ logs, filter = 'all' }: Props) {
  const visibleLogs = filter === 'all' ? logs : logs.filter((log) => log.type === filter);
  return (
    <View style={styles.panel}>
      {visibleLogs.length === 0 ? <Text style={styles.empty}>暂无日志</Text> : null}
      {visibleLogs.map((log) => (
        <View key={log.id} style={styles.item}>
          <Text style={[styles.type, styles[log.type]]}>{log.type.toUpperCase()}</Text>
          <Text style={styles.message}>{log.message}</Text>
          {log.detail ? <Text style={styles.detail}>{log.detail}</Text> : null}
          <Text style={styles.time}>{new Date(log.timestamp).toLocaleTimeString()}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: 8,
  },
  empty: {
    padding: 16,
    color: '#667085',
    textAlign: 'center',
  },
  item: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d0d7de',
    backgroundColor: '#fff',
    gap: 4,
  },
  type: {
    fontSize: 12,
    fontWeight: '800',
  },
  message: {
    color: '#17202a',
    fontWeight: '600',
  },
  detail: {
    color: '#667085',
    fontSize: 12,
  },
  time: {
    color: '#8c959f',
    fontSize: 11,
  },
  info: {
    color: '#0969da',
  },
  warn: {
    color: '#9a6700',
  },
  error: {
    color: '#cf222e',
  },
  api: {
    color: '#1f883d',
  },
  debug: {
    color: '#8250df',
  },
});
