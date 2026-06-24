import { View } from 'react-native';
import { robotActions, useRobotStore } from '../../store/robotStore';
import { stateTone } from '../../utils/status';
import { AppButton } from '../AppButton';
import { HelpText } from '../HelpText';
import { SectionCard } from '../SectionCard';
import { StatusCard } from '../StatusCard';

const DURATION_MS = 300;
const FRESHNESS_SEC = 3;

function test(mode: 'forward' | 'backward' | 'left' | 'right') {
  const preset = {
    forward: { linear_x: 0.03, angular_z: 0 },
    backward: { linear_x: -0.03, angular_z: 0 },
    left: { linear_x: 0, angular_z: 0.15 },
    right: { linear_x: 0, angular_z: -0.15 },
  }[mode];
  return robotActions.chassisTest({ mode, duration_ms: DURATION_MS, ...preset });
}

export function ChassisTestPanel() {
  const { pending, debugStatus, systemStatus } = useRobotStore((snapshot) => ({
    pending: snapshot.pending,
    debugStatus: snapshot.debugStatus,
    systemStatus: snapshot.systemStatus,
  }));
  const topics = debugStatus?.topics ?? {};
  const nodes = debugStatus?.nodes ?? {};
  const lockReasons = [
    !topics['/odom'] ? '/odom 未就绪' : null,
    !topics['/scan'] ? '/scan 未就绪' : null,
    !topics['/imu/data'] ? '/imu/data 未就绪' : null,
    !nodes.tf ? 'TF 未就绪' : null,
    debugStatus?.lastOdomAgeSec == null || debugStatus.lastOdomAgeSec > FRESHNESS_SEC ? '/odom 数据超过 3 秒或无数据' : null,
    debugStatus?.lastScanAgeSec == null || debugStatus.lastScanAgeSec > FRESHNESS_SEC ? '/scan 数据超过 3 秒或无数据' : null,
    debugStatus?.lastImuAgeSec == null || debugStatus.lastImuAgeSec > FRESHNESS_SEC ? '/imu/data 数据超过 3 秒或无数据' : null,
  ].filter(Boolean);
  const ready = Boolean(
    topics['/odom'] &&
      topics['/scan'] &&
      topics['/imu/data'] &&
      nodes.tf &&
      debugStatus?.lastOdomAgeSec != null &&
      debugStatus.lastOdomAgeSec <= FRESHNESS_SEC &&
      debugStatus?.lastScanAgeSec != null &&
      debugStatus.lastScanAgeSec <= FRESHNESS_SEC &&
      debugStatus?.lastImuAgeSec != null &&
      debugStatus.lastImuAgeSec <= FRESHNESS_SEC,
  );

  return (
    <SectionCard title="底盘低速调试" description="启动 bringup 后检查传感器新鲜度，再发送 300ms 点动命令。">
      <HelpText tone="warning">风险提示：底盘测试会发送短时运动命令，请确认轮子架空或周围安全。</HelpText>
      <HelpText tone={ready ? 'success' : 'warning'}>
        {ready ? '底盘方向按钮已满足解锁条件。' : `方向按钮锁定：${lockReasons.join('、') || '等待状态刷新'}`}
      </HelpText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <StatusCard title="bringup 进程" value={systemStatus?.bringup?.running} tone={stateTone(systemStatus?.bringup?.running)} />
        <StatusCard title="底盘前置条件" value={ready ? '已满足' : '未满足'} tone={ready ? 'success' : 'warning'} />
        <StatusCard title="/imu/data" value={topics['/imu/data']} tone={stateTone(topics['/imu/data'])} />
        <StatusCard title="TF" value={nodes.tf} tone={stateTone(nodes.tf)} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <AppButton label="启动底盘" description="system/start/bringup" variant="warning" loading={pending.system} onPress={() => robotActions.startBringup()} style={{ flex: 1, minWidth: 140 }} />
        <AppButton label="刷新底盘状态" loading={pending.debug} onPress={() => robotActions.refreshDebugStatus()} style={{ flex: 1, minWidth: 140 }} />
        <AppButton label="全局急停" description="POST /api/stop" variant="danger" loading={pending.stop} onPress={() => robotActions.stop()} style={{ flex: 1, minWidth: 140 }} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <AppButton label="短时前进" description="0.03 m/s，300ms" disabled={!ready} loading={pending.velocity} onPress={() => test('forward')} style={{ flex: 1, minWidth: 140 }} />
        <AppButton label="短时后退" description="-0.03 m/s，300ms" disabled={!ready} loading={pending.velocity} onPress={() => test('backward')} style={{ flex: 1, minWidth: 140 }} />
        <AppButton label="短时左转" description="0.15 rad/s，300ms" disabled={!ready} loading={pending.velocity} onPress={() => test('left')} style={{ flex: 1, minWidth: 140 }} />
        <AppButton label="短时右转" description="-0.15 rad/s，300ms" disabled={!ready} loading={pending.velocity} onPress={() => test('right')} style={{ flex: 1, minWidth: 140 }} />
        <AppButton label="底盘停止" variant="secondary" loading={pending.velocity} onPress={() => robotActions.chassisStop()} style={{ flex: 1, minWidth: 140 }} />
      </View>
    </SectionCard>
  );
}
