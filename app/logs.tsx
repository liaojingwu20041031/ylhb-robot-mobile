import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppLogType } from '../src/api/types';
import { LogPanel } from '../src/components/LogPanel';
import { PageContainer } from '../src/components/PageContainer';
import { robotActions, useRobotStore } from '../src/store/robotStore';

const filters: Array<AppLogType | 'all'> = ['all', 'info', 'warn', 'error', 'api', 'debug'];

export default function LogsPage() {
  const logs = useRobotStore((snapshot) => snapshot.logs);
  const [filter, setFilter] = useState<AppLogType | 'all'>('all');

  return (
    <PageContainer title="日志" subtitle="APP 内操作、请求结果和错误信息">
      <View style={styles.filters}>
        {filters.map((item) => (
          <TouchableOpacity
            key={item}
            style={[styles.filter, filter === item && styles.filterActive]}
            onPress={() => setFilter(item)}
          >
            <Text style={[styles.filterText, filter === item && styles.filterActiveText]}>
              {item}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={styles.clear} onPress={() => robotActions.clearLogs()}>
        <Text style={styles.clearText}>清空日志</Text>
      </TouchableOpacity>
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
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d0d7de',
  },
  filterActive: {
    backgroundColor: '#1f6feb',
    borderColor: '#1f6feb',
  },
  filterText: {
    color: '#17202a',
    fontWeight: '700',
  },
  filterActiveText: {
    color: '#fff',
  },
  clear: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#57606a',
    alignItems: 'center',
  },
  clearText: {
    color: '#fff',
    fontWeight: '800',
  },
});
