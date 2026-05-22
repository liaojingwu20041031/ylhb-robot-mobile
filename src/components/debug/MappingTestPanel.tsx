import { View } from 'react-native';
import { robotActions, useRobotStore } from '../../store/robotStore';
import { stateTone } from '../../utils/status';
import { AppButton } from '../AppButton';
import { HelpText } from '../HelpText';
import { SectionCard } from '../SectionCard';
import { StatusCard } from '../StatusCard';

export function MappingTestPanel() {
  const { debugStatus, pending } = useRobotStore((snapshot) => ({
    debugStatus: snapshot.debugStatus,
    pending: snapshot.pending,
  }));
  const nodes = debugStatus?.nodes ?? {};
  const topics = debugStatus?.topics ?? {};
  return (
    <SectionCard title="建图测试" description="建图依赖 bringup、/scan、/odom、TF、slam_toolbox 与 /map。">
      <HelpText tone="warning">风险提示：启动建图前请确认机器人周围安全，低速移动，必要时立即全局 STOP。</HelpText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <StatusCard title="bringup" value={nodes.bringup} tone={stateTone(nodes.bringup)} />
        <StatusCard title="/scan" value={topics['/scan']} tone={stateTone(topics['/scan'])} />
        <StatusCard title="/odom" value={topics['/odom']} tone={stateTone(topics['/odom'])} />
        <StatusCard title="TF" value={nodes.tf} tone={stateTone(nodes.tf)} />
        <StatusCard title="slam_toolbox" value={nodes.slam_toolbox} tone={stateTone(nodes.slam_toolbox)} />
        <StatusCard title="/map" value={topics['/map']} tone={stateTone(topics['/map'])} />
      </View>
      <HelpText tone="info">默认保存路径：~/ros2_ws/src/my_map.yaml</HelpText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <AppButton label="检查建图依赖" loading={pending.mapping} onPress={() => robotActions.mappingStatus()} style={{ flex: 1, minWidth: 140 }} />
        <AppButton label="启动建图" variant="warning" loading={pending.mapping} onPress={() => robotActions.startMapping()} style={{ flex: 1, minWidth: 140 }} />
        <AppButton label="保存地图为 my_map" variant="warning" loading={pending.mapping} onPress={() => robotActions.saveMapping({ map_name: 'my_map' })} style={{ flex: 1, minWidth: 140 }} />
        <AppButton label="停止建图" variant="secondary" loading={pending.mapping} onPress={() => robotActions.stopMapping()} style={{ flex: 1, minWidth: 140 }} />
      </View>
    </SectionCard>
  );
}
