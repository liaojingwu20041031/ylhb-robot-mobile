import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../src/components/AppButton';
import { FreshnessBadge } from '../src/components/FreshnessBadge';
import { HelpText } from '../src/components/HelpText';
import { PageContainer } from '../src/components/PageContainer';
import { SectionCard } from '../src/components/SectionCard';
import { StatusBadge } from '../src/components/StatusBadge';
import { StatusCard } from '../src/components/StatusCard';
import { colors } from '../src/theme/consoleTheme';
import { buildDiagnostics, freshnessTone, stateTone, textOrUnknown } from '../src/utils/status';
import { robotActions, useRobotStore } from '../src/store/robotStore';

export default function StatusPage() {
  const { status, debugStatus, systemStatus, mappingStatus, statusSource, pending, refreshIntervalMs } = useRobotStore((snapshot) => ({
    status: snapshot.status,
    debugStatus: snapshot.debugStatus,
    systemStatus: snapshot.systemStatus,
    mappingStatus: snapshot.mappingStatus,
    statusSource: snapshot.statusSource,
    pending: snapshot.pending,
    refreshIntervalMs: snapshot.refreshIntervalMs,
  }));

  useEffect(() => {
    robotActions.startStatusSocket();
    robotActions.refreshStatusBundle();
    const timer = setInterval(() => robotActions.refreshStatusBundle(), refreshIntervalMs);
    return () => clearInterval(timer);
  }, [refreshIntervalMs]);

  const topic = (name: string) => debugStatus?.topics?.[name];
  const node = (name: string) => debugStatus?.nodes?.[name];

  return (
    <PageContainer title="状态检查" subtitle="真实 mobile_bridge、ROS2 话题、进程和建图状态。">
      <SectionCard
        title="刷新与来源"
        description="WebSocket 失败不会断开整体连接，状态会回退到 HTTP fallback。"
        summary={<StatusBadge label={statusSource} tone={statusSource === '未知' ? 'neutral' : 'info'} />}
        actions={
          <View style={styles.actionRow}>
            <AppButton label="立即刷新" loading={pending.statusPending} onPress={() => robotActions.refreshStatusBundle(true)} style={styles.actionButton} />
            <AppButton label="复制状态报告" variant="secondary" loading={pending.copyPending} onPress={() => robotActions.copyStatusReport()} style={styles.actionButton} />
          </View>
        }
      >
        <Text style={styles.meta}>刷新间隔：{refreshIntervalMs} ms</Text>
      </SectionCard>

      <StatusGroup title="Bridge" description="手机 APP 到 Jetson ylhb_mobile_bridge 的连接。">
        <StatusCard title="connection" value={status.connectionState} tone={stateTone(status.connectionState)} />
        <StatusCard title="online" value={status.online} tone={stateTone(status.online)} />
      </StatusGroup>
      <StatusGroup title="底盘与传感器" description="/cmd_vel 可用于架空测试，地面移动还需要 /odom 新鲜。">
        <StatusCard title="/cmd_vel" value={topic('/cmd_vel')} tone={stateTone(topic('/cmd_vel'))} />
        <StatusCard title="ZLAC" value={status.zlacStatus ?? debugStatus?.zlacStatus} />
        <StatusCard title="/odom" value={topic('/odom')} tone={stateTone(topic('/odom'))} />
        <FreshMetric title="/odom 新鲜度" age={status.lastOdomAgeSec ?? debugStatus?.lastOdomAgeSec} />
        <StatusCard title="/scan" value={topic('/scan')} tone={stateTone(topic('/scan'))} />
        <FreshMetric title="/scan 新鲜度" age={status.lastScanAgeSec ?? debugStatus?.lastScanAgeSec} />
        <StatusCard title="/imu/data" value={topic('/imu/data')} tone={stateTone(topic('/imu/data'))} />
        <FreshMetric title="/imu/data 新鲜度" age={debugStatus?.lastImuAgeSec} />
        <StatusCard title="TF" value={node('tf')} tone={stateTone(node('tf'))} />
      </StatusGroup>
      <StatusGroup title="系统进程" description="由 bridge 管理的 bringup 和 mapping 进程。">
        <StatusCard title="bringup" value={systemStatus?.bringup?.running} tone={stateTone(systemStatus?.bringup?.running)} />
        <StatusCard title="bringup PID" value={systemStatus?.bringup?.pid ?? '无'} />
        <StatusCard title="mapping" value={systemStatus?.mapping?.running} tone={stateTone(systemStatus?.mapping?.running)} />
        <StatusCard title="mapping PID" value={systemStatus?.mapping?.pid ?? '无'} />
      </StatusGroup>
      <StatusGroup title="建图与导航" description="Nav2 本轮只展示状态，不提供路线或巡检任务入口。">
        <StatusCard title="mapping status" value={mappingStatus?.mappingStatus ?? status.mappingStatus ?? debugStatus?.mappingStatus} />
        <StatusCard title="slam_toolbox" value={node('slam_toolbox')} tone={stateTone(node('slam_toolbox'))} />
        <StatusCard title="/map" value={topic('/map')} tone={stateTone(topic('/map'))} />
        <FreshMetric title="/map 新鲜度" age={mappingStatus?.lastMapAgeSec ?? debugStatus?.lastMapAgeSec} />
        <StatusCard title="Nav2" value={status.nav2Status ?? debugStatus?.nav2Status} />
      </StatusGroup>
      <SectionCard title="诊断建议" description="按当前真实状态给出下一步排查方向。">
        {buildDiagnostics(status, debugStatus).map((tip) => <HelpText key={tip} tone={tip.includes('正常') ? 'success' : 'warning'}>{tip}</HelpText>)}
      </SectionCard>
    </PageContainer>
  );
}

function StatusGroup({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <SectionCard title={title} description={description}>
      <View style={styles.grid}>{children}</View>
    </SectionCard>
  );
}

function FreshMetric({ title, age }: { title: string; age?: number | null }) {
  return (
    <View style={[styles.fresh, freshnessTone(age) === 'danger' && styles.freshDanger]}>
      <Text style={styles.freshTitle}>{title}</Text>
      <FreshnessBadge age={age ?? undefined} />
      <Text style={styles.freshNote}>{textOrUnknown(age)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    minWidth: 138,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  meta: {
    color: colors.textMuted,
    fontSize: 13,
  },
  fresh: {
    flex: 1,
    minWidth: 142,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    gap: 8,
  },
  freshDanger: {
    borderColor: colors.danger,
  },
  freshTitle: {
    color: colors.textMuted,
    fontWeight: '800',
  },
  freshNote: {
    color: colors.textSubtle,
    fontSize: 11,
  },
});
