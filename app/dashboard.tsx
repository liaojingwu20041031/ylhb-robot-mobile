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

export default function DashboardPage() {
  const { status, debugStatus, systemStatus, mappingStatus, websocketEnabled, statusSource, pending, mockMode } = useRobotStore((snapshot) => ({
    status: snapshot.status,
    debugStatus: snapshot.debugStatus,
    systemStatus: snapshot.systemStatus,
    mappingStatus: snapshot.mappingDebugStatus,
    websocketEnabled: snapshot.websocketEnabled,
    statusSource: snapshot.statusSource,
    pending: snapshot.pending,
    mockMode: snapshot.mockMode,
  }));

  useEffect(() => {
    robotActions.refreshStatus();
    robotActions.refreshDebugStatus();
    robotActions.refreshSystemStatus();
    robotActions.mappingStatus();
    if (websocketEnabled) {
      robotActions.startStatusSocket();
      return () => robotActions.stopStatusSocket();
    }
    return undefined;
  }, [websocketEnabled]);

  const topic = (name: string) => debugStatus?.topics?.[name];
  const node = (name: string) => debugStatus?.nodes?.[name];

  return (
    <PageContainer title="状态监控" subtitle="面向 mobile_bridge 调试阶段，显示连接、底盘、传感器、建图与进程状态。">
      <SectionCard
        title="刷新与来源"
        description="状态来源可能是 Mock、WebSocket 或 HTTP Polling。"
        summary={<StatusBadge label={statusSource} tone={statusSource === 'Mock' ? 'warning' : statusSource === '未知' ? 'neutral' : 'info'} />}
        actions={
          <View style={styles.actionRow}>
            <AppButton label="刷新状态" loading={pending.status || pending.debug} onPress={() => { robotActions.refreshStatus(); robotActions.refreshDebugStatus(); }} style={styles.actionButton} />
            <AppButton label="复制状态报告" variant="secondary" loading={pending.copy} onPress={() => robotActions.copyStatusReport()} style={styles.actionButton} />
          </View>
        }
      >
        <Text style={styles.meta} selectable>当前模式：{mockMode ? 'Mock Mode' : 'Real Robot Mode'}</Text>
      </SectionCard>

      <LinkGroup title="连接链路" description="Jetson bridge 与手机端通信状态。">
        <StatusCard title="Bridge" value={status.connectionState} tone={stateTone(status.connectionState)} />
        <StatusCard title="在线" value={status.online} tone={stateTone(status.online)} />
      </LinkGroup>
      <LinkGroup title="底盘链路" description="ZLAC 与 CAN 状态，异常时禁止点动测试。">
        <StatusCard title="ZLAC status" value={status.zlacStatus ?? debugStatus?.zlacStatus} />
        <StatusCard title="CAN status" value={status.canStatus} />
        <StatusCard title="/cmd_vel" value={topic('/cmd_vel')} tone={stateTone(topic('/cmd_vel'))} />
      </LinkGroup>
      <LinkGroup title="感知链路" description="雷达数据与扫描新鲜度。">
        <FreshMetric title="/scan 新鲜度" age={status.lastScanAgeSec ?? debugStatus?.lastScanAgeSec} />
        <StatusCard title="/scan" value={topic('/scan')} tone={stateTone(topic('/scan'))} />
      </LinkGroup>
      <LinkGroup title="定位链路" description="里程计与定位基础状态。">
        <FreshMetric title="/odom 新鲜度" age={status.lastOdomAgeSec ?? debugStatus?.lastOdomAgeSec} />
        <StatusCard title="/odom" value={topic('/odom')} tone={stateTone(topic('/odom'))} />
        <FreshMetric title="/imu/data 新鲜度" age={debugStatus?.lastImuAgeSec ?? undefined} />
        <StatusCard title="/imu/data" value={topic('/imu/data')} tone={stateTone(topic('/imu/data'))} />
        <StatusCard title="TF" value={node('tf')} tone={stateTone(node('tf'))} />
      </LinkGroup>
      <LinkGroup title="建图链路" description="slam_toolbox 与 /map 发布状态。">
        <StatusCard title="mapping" value={mappingStatus?.mappingStatus ?? status.mappingStatus ?? debugStatus?.mappingStatus} />
        <StatusCard title="bringup_ready" value={mappingStatus?.bringupReady} tone={stateTone(mappingStatus?.bringupReady)} />
        <StatusCard title="map_available" value={mappingStatus?.mapAvailable} tone={stateTone(mappingStatus?.mapAvailable)} />
        <StatusCard title="slam_toolbox" value={node('slam_toolbox')} tone={stateTone(node('slam_toolbox'))} />
        <StatusCard title="/map" value={topic('/map')} tone={stateTone(topic('/map'))} />
      </LinkGroup>
      <LinkGroup title="系统进程" description="由 mobile_bridge 管理的 bringup 与 mapping 进程。">
        <StatusCard title="system_mode" value={status.systemMode ?? debugStatus?.systemMode} />
        <StatusCard title="bringup running" value={systemStatus?.bringup?.running} tone={stateTone(systemStatus?.bringup?.running)} />
        <StatusCard title="bringup PID" value={systemStatus?.bringup?.pid ?? '无'} />
        <StatusCard title="mapping running" value={systemStatus?.mapping?.running} tone={stateTone(systemStatus?.mapping?.running)} />
        <StatusCard title="mapping PID" value={systemStatus?.mapping?.pid ?? '无'} />
      </LinkGroup>
      <SectionCard title="故障诊断建议" description="根据新鲜度、话题和节点状态给出下一步排查方向。">
        {buildDiagnostics(status, debugStatus).map((tip) => <HelpText key={tip} tone={tip.includes('可用') ? 'success' : 'warning'}>{tip}</HelpText>)}
      </SectionCard>
    </PageContainer>
  );
}

function LinkGroup({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <SectionCard title={title} description={description}>
      <View style={styles.grid}>{children}</View>
    </SectionCard>
  );
}

function FreshMetric({ title, age }: { title: string; age?: number }) {
  return (
    <View style={[styles.fresh, freshnessTone(age) === 'danger' && styles.freshDanger]}>
      <Text style={styles.freshTitle}>{title}</Text>
      <FreshnessBadge age={age} />
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
