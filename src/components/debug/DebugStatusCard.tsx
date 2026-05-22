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
  return (
    <SectionCard
      title="系统检查"
      description="检查 Bridge、bringup、ZLAC、/scan、/odom、TF、system_mode 和 task_status。"
      actions={
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <AppButton label="刷新状态" loading={pending.debug} onPress={() => robotActions.refreshDebugStatus()} style={{ flex: 1, minWidth: 130 }} />
          <AppButton label="复制状态报告" variant="secondary" loading={pending.copy} onPress={() => robotActions.copyStatusReport()} style={{ flex: 1, minWidth: 130 }} />
        </View>
      }
    >
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <StatusCard title="Bridge" value={status?.online} tone={stateTone(status?.online)} />
        <StatusCard title="bringup" value={nodes.bringup} tone={stateTone(nodes.bringup)} />
        <StatusCard title="ZLAC" value={status?.zlacStatus ?? nodes.zlac8015d_canopen_controller} />
        <StatusCard title="/scan" value={topics['/scan']} tone={stateTone(topics['/scan'])} />
        <StatusCard title="/odom" value={topics['/odom']} tone={stateTone(topics['/odom'])} />
        <StatusCard title="TF" value={nodes.tf} tone={stateTone(nodes.tf)} />
        <StatusCard title="system_mode" value={status?.systemMode} />
        <StatusCard title="task_status" value={status?.taskStatus} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <FreshLine title="/odom 更新时间" age={status?.lastOdomAgeSec} />
        <FreshLine title="/scan 更新时间" age={status?.lastScanAgeSec} />
      </View>
      <HelpText tone="warning">系统检查仅展示 bridge 返回内容；缺失字段显示未知，不代表链路正常。</HelpText>
    </SectionCard>
  );
}

function FreshLine({ title, age }: { title: string; age?: number }) {
  return (
    <View style={{ flex: 1, minWidth: 150, gap: 6 }}>
      <StatusCard title={title} value={age} />
      <FreshnessBadge age={age} />
    </View>
  );
}
