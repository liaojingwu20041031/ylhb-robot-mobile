import { View } from 'react-native';
import { LogPanel } from '../LogPanel';
import { robotActions, useRobotStore } from '../../store/robotStore';
import { AppButton } from '../AppButton';
import { SectionCard } from '../SectionCard';

export function DebugLogPanel() {
  const { logs, pending } = useRobotStore((snapshot) => ({
    logs: snapshot.logs,
    pending: snapshot.pending,
  }));
  return (
    <SectionCard title="调试日志" description="显示最近调试操作，并支持复制纯文本调试日志。">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <AppButton label="复制调试日志" variant="secondary" loading={pending.copy} onPress={() => robotActions.copyLogs('recent50')} style={{ flex: 1, minWidth: 140 }} />
        <AppButton label="清空日志" variant="ghost" onPress={() => robotActions.clearLogs()} style={{ flex: 1, minWidth: 120 }} />
      </View>
      <LogPanel logs={logs.slice(0, 20)} filter="all" />
    </SectionCard>
  );
}
