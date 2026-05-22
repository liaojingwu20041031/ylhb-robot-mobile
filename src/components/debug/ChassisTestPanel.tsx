import { View } from 'react-native';
import { robotActions, useRobotStore } from '../../store/robotStore';
import { AppButton } from '../AppButton';
import { HelpText } from '../HelpText';
import { SectionCard } from '../SectionCard';

const DURATION_MS = 300;

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
  const pending = useRobotStore((snapshot) => snapshot.pending);
  return (
    <SectionCard title="底盘测试" description="用于确认 ZLAC 底盘是否响应 /cmd_vel。首次测试请架空轮子。">
      <HelpText tone="warning">风险提示：底盘测试会发送短时运动命令，请确认轮子架空或周围安全。</HelpText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <AppButton label="短时前进" description="0.03 m/s，300ms" loading={pending.velocity} onPress={() => test('forward')} style={{ flex: 1, minWidth: 140 }} />
        <AppButton label="短时后退" description="-0.03 m/s，300ms" loading={pending.velocity} onPress={() => test('backward')} style={{ flex: 1, minWidth: 140 }} />
        <AppButton label="短时左转" description="0.15 rad/s，300ms" loading={pending.velocity} onPress={() => test('left')} style={{ flex: 1, minWidth: 140 }} />
        <AppButton label="短时右转" description="-0.15 rad/s，300ms" loading={pending.velocity} onPress={() => test('right')} style={{ flex: 1, minWidth: 140 }} />
        <AppButton label="立即停止" variant="secondary" loading={pending.velocity} onPress={() => robotActions.chassisStop()} style={{ flex: 1, minWidth: 140 }} />
      </View>
    </SectionCard>
  );
}
