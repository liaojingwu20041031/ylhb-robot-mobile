import { StyleSheet, Text, View } from 'react-native';
import { AppLog, AppLogType } from '../api/types';
import { colors, radius } from '../theme/consoleTheme';

type Props = {
  logs: AppLog[];
  filter?: AppLogType | 'all';
};

const labels: Record<AppLogType, string> = {
  info: '信息',
  warn: '警告',
  error: '错误',
  api: 'API',
  debug: '调试',
  user: '用户操作',
};

export function LogPanel({ logs, filter = 'all' }: Props) {
  const visibleLogs = filter === 'all' ? logs : logs.filter((log) => log.type === filter);
  return (
    <View style={styles.panel}>
      {visibleLogs.length === 0 ? <Text style={styles.empty}>暂无日志</Text> : null}
      {visibleLogs.map((log) => (
        <View key={log.id} style={styles.item}>
          <View style={styles.metaRow}>
            <Text style={[styles.type, styles[log.type]]}>{labels[log.type]}</Text>
            <Text style={styles.source}>{log.source ?? 'APP'}</Text>
            <Text style={styles.time}>{new Date(log.timestamp).toLocaleTimeString()}</Text>
          </View>
          <Text style={styles.message} selectable>{log.message}</Text>
          {log.detail ? <Text style={styles.detail} selectable>{log.detail}</Text> : null}
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
    color: colors.textMuted,
    textAlign: 'center',
  },
  item: {
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  type: {
    fontSize: 12,
    fontWeight: '900',
  },
  source: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: '700',
  },
  message: {
    color: colors.text,
    fontWeight: '700',
    lineHeight: 19,
  },
  detail: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  time: {
    color: colors.textSubtle,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  info: {
    color: '#79c0ff',
  },
  warn: {
    color: '#f2cc60',
  },
  error: {
    color: '#ff938a',
  },
  api: {
    color: '#7ee787',
  },
  debug: {
    color: '#d2a8ff',
  },
  user: {
    color: '#c9d1d9',
  },
});
