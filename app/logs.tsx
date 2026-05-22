import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppLogType } from '../src/api/types';
import { AppButton } from '../src/components/AppButton';
import { LogPanel } from '../src/components/LogPanel';
import { PageContainer } from '../src/components/PageContainer';
import { SectionCard } from '../src/components/SectionCard';
import { colors } from '../src/theme/consoleTheme';
import { robotActions, useRobotStore } from '../src/store/robotStore';

const filters: Array<{ key: AppLogType | 'all'; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'info', label: '信息' },
  { key: 'warn', label: '警告' },
  { key: 'error', label: '错误' },
  { key: 'api', label: 'API' },
  { key: 'debug', label: '调试' },
  { key: 'user', label: '用户操作' },
];

export default function LogsPage() {
  const { logs, pending } = useRobotStore((snapshot) => ({
    logs: snapshot.logs,
    pending: snapshot.pending,
  }));
  const [filter, setFilter] = useState<AppLogType | 'all'>('all');

  return (
    <PageContainer title="系统日志" subtitle="APP 操作、请求结果、错误信息和调试记录。">
      <SectionCard title="日志筛选" description="复制内容为纯文本，方便发给 Codex 或 ChatGPT 分析。">
        <View style={styles.filters}>
          {filters.map((item) => (
            <AppButton
              key={item.key}
              label={item.label}
              variant={filter === item.key ? 'primary' : 'ghost'}
              onPress={() => setFilter(item.key)}
              style={styles.filter}
            />
          ))}
        </View>
        <View style={styles.actions}>
          <AppButton label="复制全部日志" variant="secondary" loading={pending.copy} onPress={() => robotActions.copyLogs('all')} style={styles.action} />
          <AppButton label="复制错误日志" variant="warning" loading={pending.copy} onPress={() => robotActions.copyLogs('errors')} style={styles.action} />
          <AppButton label="复制最近 50 条" variant="secondary" loading={pending.copy} onPress={() => robotActions.copyLogs('recent50')} style={styles.action} />
          <AppButton label="清空日志" variant="danger" onPress={() => robotActions.clearLogs()} style={styles.action} />
        </View>
        <Text style={styles.count}>当前日志数量：{logs.length}</Text>
      </SectionCard>
      <LogPanel logs={logs} filter={filter} />
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filter: {
    minWidth: 76,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  action: {
    flex: 1,
    minWidth: 130,
  },
  count: {
    color: colors.textMuted,
    fontSize: 12,
  },
});
