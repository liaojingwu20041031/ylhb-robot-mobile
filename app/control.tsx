import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../src/components/AppButton';
import { ControlPad } from '../src/components/ControlPad';
import { HelpText } from '../src/components/HelpText';
import { PageContainer } from '../src/components/PageContainer';
import { SectionCard } from '../src/components/SectionCard';
import { StatusCard } from '../src/components/StatusCard';
import { robotActions, useRobotStore } from '../src/store/robotStore';
import { colors } from '../src/theme/consoleTheme';
import { stateTone } from '../src/utils/status';

export default function ControlPage() {
  const { systemStatus, pending } = useRobotStore((snapshot) => ({
    systemStatus: snapshot.systemStatus,
    pending: snapshot.pending,
  }));

  useEffect(() => {
    robotActions.refreshSystemStatus();
    robotActions.refreshDebugStatus();
    const timer = setInterval(() => {
      robotActions.refreshSystemStatus();
      robotActions.refreshDebugStatus();
    }, 1000);
    return () => {
      clearInterval(timer);
      robotActions.emergencyStop(true);
    };
  }, []);

  return (
    <PageContainer title="底盘控制" subtitle="低速点动测试，危险情况请立即急停。">
      <SectionCard
        title="底层进程（bringup）"
        description="底盘、雷达、IMU 和 TF 的基础进程，只管理由当前 bridge 启动的实例。"
        actions={
          <View style={styles.actions}>
            <AppButton label="启动底盘" loading={pending.systemPending} onPress={() => robotActions.startBringup()} style={styles.action} />
            <AppButton label="关闭底盘" variant="warning" loading={pending.systemPending} onPress={() => robotActions.stopBringup()} style={styles.action} />
          </View>
        }
      >
        <View style={styles.grid}>
          <StatusCard title="运行中（running）" value={systemStatus?.bringup?.running} tone={stateTone(systemStatus?.bringup?.running)} />
          <StatusCard title="PID" value={systemStatus?.bringup?.pid ?? '无'} />
          <StatusCard title="桥接管理（managed_by_bridge）" value={systemStatus?.bringup?.managed_by_bridge} tone={stateTone(systemStatus?.bringup?.managed_by_bridge)} />
          <StatusCard title="返回码（returncode）" value={systemStatus?.bringup?.returncode ?? '无'} />
        </View>
        {systemStatus?.bringup && !systemStatus.bringup.managed_by_bridge ? (
          <HelpText tone="warning">该进程不是本 APP/bridge 启动，需要回到原 SSH/终端停止。</HelpText>
        ) : null}
        {systemStatus?.bringup?.log_tail ? <Text style={styles.logTail} numberOfLines={6}>{systemStatus.bringup.log_tail}</Text> : null}
      </SectionCard>

      <SectionCard title="点动控制" description="连接和 /cmd_vel 可用后，按住方向键连续低速运动；松手立即调用 /api/stop。">
        <ControlPad />
      </SectionCard>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  action: {
    flex: 1,
    minWidth: 130,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  logTail: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: colors.bgElevated,
    borderColor: colors.border,
    borderWidth: 1,
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
  },
});
