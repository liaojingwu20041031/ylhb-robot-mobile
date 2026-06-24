import { StyleSheet, Text, View } from 'react-native';
import { ProcessStatus } from '../../api/types';
import { robotActions, useRobotStore } from '../../store/robotStore';
import { colors } from '../../theme/consoleTheme';
import { stateTone } from '../../utils/status';
import { AppButton } from '../AppButton';
import { HelpText } from '../HelpText';
import { SectionCard } from '../SectionCard';
import { StatusBadge } from '../StatusBadge';
import { StatusCard } from '../StatusCard';

function formatStartedAt(value: number | null) {
  if (!value) return '未启动';
  return new Date(value * 1000).toLocaleTimeString();
}

function ProcessBlock({ title, process }: { title: string; process?: ProcessStatus }) {
  return (
    <View style={styles.processBlock}>
      <View style={styles.processHeader}>
        <Text style={styles.processTitle}>{title}</Text>
        <StatusBadge label={process?.running ? '运行中' : '未运行'} tone={process?.running ? 'success' : 'neutral'} />
      </View>
      <View style={styles.processGrid}>
        <StatusCard title="PID" value={process?.pid ?? '无'} tone={stateTone(process?.running)} />
        <StatusCard title="Bridge 管理" value={process?.managed_by_bridge ?? false} tone={stateTone(process?.managed_by_bridge)} />
        <StatusCard title="启动时间" value={formatStartedAt(process?.started_at ?? null)} tone={process?.running ? 'success' : 'neutral'} />
        <StatusCard title="退出码" value={process?.returncode ?? '无'} tone={process?.returncode == null ? 'neutral' : process.returncode === 0 ? 'success' : 'danger'} />
      </View>
      {process?.log_tail ? (
        <View style={styles.logBox}>
          <Text style={styles.logTitle}>最近日志</Text>
          <Text style={styles.logText} selectable>{process.log_tail}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function SystemProcessPanel() {
  const { systemStatus, pending } = useRobotStore((snapshot) => ({
    systemStatus: snapshot.systemStatus,
    pending: snapshot.pending,
  }));

  return (
    <SectionCard
      title="系统进程"
      description="按 mobile_bridge 管理 bringup 与 mapping，停止 bringup 前请先停止建图。"
      actions={
        <View style={styles.actions}>
          <AppButton label="刷新进程" loading={pending.system} onPress={() => robotActions.refreshSystemStatus()} style={styles.actionButton} />
          <AppButton label="启动底盘" variant="warning" loading={pending.system} onPress={() => robotActions.startBringup()} style={styles.actionButton} />
          <AppButton label="停止底盘" variant="secondary" loading={pending.system} onPress={() => robotActions.stopBringup()} style={styles.actionButton} />
        </View>
      }
    >
      <HelpText tone="info">重复启动会由后端返回 already running；未由 Bridge 启动的进程不会被停止接口强杀。</HelpText>
      <ProcessBlock title="Bringup / 底盘" process={systemStatus?.bringup} />
      <ProcessBlock title="Mapping / 建图" process={systemStatus?.mapping} />
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    minWidth: 120,
  },
  processBlock: {
    gap: 10,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  processHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  processTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  processGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  logBox: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  logTitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  logText: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 17,
  },
});