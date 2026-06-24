import { StyleSheet, View } from 'react-native';
import { useRobotStore } from '../../store/robotStore';
import { RouteMapPanel } from './RouteMapPanel';
import { HelpText } from '../HelpText';
import { SectionCard } from '../SectionCard';
import { StatusCard } from '../StatusCard';
import { stateTone } from '../../utils/status';

export function NavigationTestPanel() {
  const { debugStatus } = useRobotStore((snapshot) => ({
    debugStatus: snapshot.debugStatus,
  }));
  const topics = debugStatus?.topics ?? {};
  const nodes = debugStatus?.nodes ?? {};

  return (
    <>
      <SectionCard
        title="导航依赖检查"
        description="导航/路线调试前，确认地图、AMCL、Nav2、/scan、/odom 与初始位姿。"
      >
        <HelpText tone="warning">风险提示：发送目标点或启动巡逻可能导致机器人移动。请确认地图、定位和周边环境安全。</HelpText>
        <View style={styles.grid}>
          <StatusCard title="my_map.yaml" value={topics['/map']} tone={stateTone(topics['/map'])} />
          <StatusCard title="/map" value={topics['/map']} tone={stateTone(topics['/map'])} />
          <StatusCard title="/scan" value={topics['/scan']} tone={stateTone(topics['/scan'])} />
          <StatusCard title="/odom" value={topics['/odom']} tone={stateTone(topics['/odom'])} />
          <StatusCard title="AMCL" value={nodes.amcl} tone={stateTone(nodes.amcl)} />
          <StatusCard title="planner_server" value={nodes.planner_server} tone={stateTone(nodes.planner_server)} />
          <StatusCard title="controller_server" value={nodes.controller_server} tone={stateTone(nodes.controller_server)} />
          <StatusCard title="bt_navigator" value={nodes.bt_navigator} tone={stateTone(nodes.bt_navigator)} />
          <StatusCard title="initial pose" value={nodes.amcl ? '需现场确认' : undefined} tone={nodes.amcl ? 'warning' : 'neutral'} />
        </View>
      </SectionCard>

      <RouteMapPanel showManualNav />
    </>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
});
