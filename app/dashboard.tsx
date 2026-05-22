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
  const { status, debugStatus, websocketEnabled, statusSource, pending, mockMode } = useRobotStore((snapshot) => ({
    status: snapshot.status,
    debugStatus: snapshot.debugStatus,
    websocketEnabled: snapshot.websocketEnabled,
    statusSource: snapshot.statusSource,
    pending: snapshot.pending,
    mockMode: snapshot.mockMode,
  }));

  useEffect(() => {
    robotActions.refreshStatus();
    robotActions.refreshDebugStatus();
    if (websocketEnabled) {
      robotActions.startStatusSocket();
      return () => robotActions.stopStatusSocket();
    }
    return undefined;
  }, [websocketEnabled]);

  const topic = (name: string) => debugStatus?.topics?.[name];
  const node = (name: string) => debugStatus?.nodes?.[name];

  return (
    <PageContainer title="状态监控" subtitle="按 ROS2 链路分组显示，后端缺字段时显示未知。">
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
      <LinkGroup title="感知链路" description="雷达数据与扫描参数。">
        <FreshMetric title="/scan 新鲜度" age={status.lastScanAgeSec ?? debugStatus?.lastScanAgeSec} />
        <StatusCard title="/scan" value={topic('/scan')} tone={stateTone(topic('/scan'))} />
        <StatusCard title="range_min/range_max" value={debugStatus?.scanRangeMin !== undefined ? `${debugStatus.scanRangeMin}/${debugStatus.scanRangeMax}` : undefined} />
      </LinkGroup>
      <LinkGroup title="定位链路" description="里程计、TF 与定位基础状态。">
        <FreshMetric title="/odom 新鲜度" age={status.lastOdomAgeSec ?? debugStatus?.lastOdomAgeSec} />
        <StatusCard title="/odom" value={topic('/odom')} tone={stateTone(topic('/odom'))} />
        <StatusCard title="TF" value={node('tf')} tone={stateTone(node('tf'))} />
      </LinkGroup>
      <LinkGroup title="建图链路" description="slam_toolbox 与 /map 发布状态。">
        <StatusCard title="mapping" value={status.mappingStatus ?? debugStatus?.mappingStatus} />
        <StatusCard title="slam_toolbox" value={node('slam_toolbox')} tone={stateTone(node('slam_toolbox'))} />
        <StatusCard title="/map" value={topic('/map')} tone={stateTone(topic('/map'))} />
      </LinkGroup>
      <LinkGroup title="导航链路" description="Nav2、AMCL、规划器与控制器状态。">
        <StatusCard title="navigation" value={status.nav2Status ?? debugStatus?.nav2Status} />
        <StatusCard title="AMCL" value={node('amcl')} tone={stateTone(node('amcl'))} />
        <StatusCard title="planner_server" value={node('planner_server')} tone={stateTone(node('planner_server'))} />
        <StatusCard title="controller_server" value={node('controller_server')} tone={stateTone(node('controller_server'))} />
        <StatusCard title="bt_navigator" value={node('bt_navigator')} tone={stateTone(node('bt_navigator'))} />
      </LinkGroup>
      <LinkGroup title="零售任务链路" description="任务层状态来自 bridge，缺字段保持未知。">
        <StatusCard title="system_mode" value={status.systemMode ?? debugStatus?.systemMode} />
        <StatusCard title="task_status" value={status.taskStatus ?? debugStatus?.taskStatus} />
        <StatusCard title="cart" value={status.cart ?? debugStatus?.cart} />
      </LinkGroup>
      <LinkGroup title="语音链路" description="销售对话状态，后端未提供时显示未知。">
        <StatusCard title="sales_dialogue_status" value={status.salesDialogueStatus ?? debugStatus?.salesDialogueStatus} />
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
