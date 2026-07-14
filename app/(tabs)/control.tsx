import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppButton } from '@/components/AppButton';
import { ControlPad } from '@/components/ControlPad';
import { HelpText } from '@/components/HelpText';
import { PageContainer } from '@/components/PageContainer';
import { SectionCard } from '@/components/SectionCard';
import { StatusCard } from '@/components/StatusCard';
import { robotActions, useRobotStore } from '@/store/robotStore';
import { booleanStateText, connectionStateText, processStateText } from '@/utils/displayText';
import { freshnessLabel } from '@/utils/status';

export default function ControlPage() {
  const { status, debugStatus, systemStatus, pending, endpointSwitching } = useRobotStore((snapshot) => ({ status: snapshot.status, debugStatus: snapshot.debugStatus, systemStatus: snapshot.systemStatus, pending: snapshot.pending, endpointSwitching: snapshot.endpointSwitching }));
  useEffect(() => {
    robotActions.refreshSystemStatus(); robotActions.refreshDebugStatus();
    const timer = setInterval(() => { robotActions.refreshSystemStatus(); robotActions.refreshDebugStatus(); }, 1000);
    return () => { clearInterval(timer); };
  }, []);
  return (
    <PageContainer title="底盘控制" subtitle="按住方向键低速移动，松手立即停止。" showSafetyBar>
      <SectionCard title="控制状态"><View style={styles.grid}>
        <StatusCard title="机器人连接" value={connectionStateText(status.connectionState)} />
        <StatusCard title="运动通道" value={booleanStateText(debugStatus?.topics?.['/cmd_vel'])} technicalLabel="/cmd_vel" />
        <StatusCard title="里程计状态" value={freshnessLabel(debugStatus?.lastOdomAgeSec ?? status.lastOdomAgeSec)} technicalLabel="/odom" />
      </View></SectionCard>
      {endpointSwitching ? <HelpText tone="warning">连接正在切换，运动控制暂不可用；急停按钮仍可使用。</HelpText> : null}
      <SectionCard title="基础驱动" description={`当前状态：${processStateText(systemStatus?.bringup?.running)}`} actions={<View style={styles.actions}>
        <AppButton label="启动基础驱动" disabled={endpointSwitching} loading={pending.systemPending} onPress={() => robotActions.startBringup()} style={styles.action} />
        <AppButton label="停止基础驱动" variant="warning" disabled={endpointSwitching} loading={pending.systemPending} onPress={() => robotActions.stopBringup()} style={styles.action} />
      </View>}>
        {systemStatus?.bringup && !systemStatus.bringup.managed_by_bridge ? <HelpText tone="warning">该进程不是由本应用启动，请回到原终端停止。</HelpText> : null}
      </SectionCard>
      <SectionCard title="方向控制" description="首次测试请架空轮子，并确保机器人周围无人。"><ControlPad /></SectionCard>
    </PageContainer>
  );
}
const styles = StyleSheet.create({ grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, action: { flex: 1, minWidth: 140 } });
