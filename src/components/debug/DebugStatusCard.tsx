import { View } from 'react-native';
import { DebugStatus } from '../../api/types';
import { stateTone } from '../../utils/status';
import { AppButton } from '../AppButton';
import { FreshnessBadge } from '../FreshnessBadge';
import { HelpText } from '../HelpText';
import { SectionCard } from '../SectionCard';
import { StatusCard } from '../StatusCard';
import { robotActions, useRobotStore } from '../../store/robotStore';

type Props = {
  status?: DebugStatus;
};

export function DebugStatusCard({ status }: Props) {
  const pending = useRobotStore((snapshot) => snapshot.pending);
  const topics = status?.topics ?? {};
  const nodes = status?.nodes ?? {};
  const chassisReady = Boolean(
    topics['/odom'] &&
      topics['/scan'] &&
      topics['/imu/data'] &&
      nodes.tf &&
      status?.lastOdomAgeSec != null &&
      status.lastOdomAgeSec <= 3 &&
      status?.lastScanAgeSec != null &&
      status.lastScanAgeSec <= 3 &&
      status?.lastImuAgeSec != null &&
      status.lastImuAgeSec <= 3,
  );

  return (
    <SectionCard
      title="状态自检"
      description="底盘调试解锁前检查 /odom、/scan、/imu/data、TF 与数据新鲜度。"
      actions={
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <AppButton label="刷新状态" loading={pending.debug} onPress={() => robotActions.refreshDebugStatus()} style={{ flex: 1, minWidth: 130 }} />
          <AppButton label="复制状态报告" variant="secondary" loading={pending.copy} onPress={() => robotActions.copyStatusReport()} style={{ flex: 1, minWidth: 130 }} />
        </View>
      }
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <StatusCard title="Bridge" value={status?.online} tone={stateTone(status?.online)} />
        <StatusCard title="底盘可控" value={chassisReady ? '满足' : '锁定'} tone={chassisReady ? 'success' : 'warning'} />
        <StatusCard title="ZLAC" value={status?.zlacStatus ?? nodes.zlac8015d_canopen_controller} />
        <StatusCard title="TF" value={nodes.tf} tone={stateTone(nodes.tf)} />
        <StatusCard title="system_mode" value={status?.systemMode} />
        <StatusCard title="task_status" value={status?.taskStatus} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <TopicCard title="/odom" ok={topics['/odom']} age={status?.lastOdomAgeSec} />
        <TopicCard title="/scan" ok={topics['/scan']} age={status?.lastScanAgeSec} />
        <TopicCard title="/imu/data" ok={topics['/imu/data']} age={status?.lastImuAgeSec} />
        <TopicCard title="/map" ok={topics['/map']} age={status?.lastMapAgeSec ?? undefined} />
      </View>
      <HelpText tone={chassisReady ? 'success' : 'warning'}>
        {chassisReady ? '底盘低速方向按钮可以解锁使用。' : '底盘未满足最低安全条件，方向按钮应保持锁定。'}
      </HelpText>
    </SectionCard>
  );
}

function TopicCard({ title, ok, age }: { title: string; ok?: boolean; age?: number | null }) {
  return (
    <View style={{ flex: 1, minWidth: 150, gap: 6 }}>
      <StatusCard title={title} value={ok} tone={stateTone(ok)} />
      <FreshnessBadge age={age ?? undefined} />
    </View>
  );
}