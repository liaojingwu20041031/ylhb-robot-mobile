import { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PageContainer } from '../src/components/PageContainer';
import { StatusCard } from '../src/components/StatusCard';
import { robotActions, useRobotStore } from '../src/store/robotStore';

export default function DashboardPage() {
  const { status, websocketEnabled } = useRobotStore((snapshot) => ({
    status: snapshot.status,
    websocketEnabled: snapshot.websocketEnabled,
  }));

  useEffect(() => {
    robotActions.refreshStatus();
    if (websocketEnabled) {
      robotActions.startStatusSocket();
      return () => robotActions.stopStatusSocket();
    }
    return undefined;
  }, [websocketEnabled]);

  return (
    <PageContainer title="状态面板" subtitle="Jetson bridge 与 ROS2 状态">
      <TouchableOpacity style={styles.button} onPress={() => robotActions.refreshStatus()}>
        <Text style={styles.buttonText}>手动刷新</Text>
      </TouchableOpacity>
      <View style={styles.grid}>
        <StatusCard title="Bridge" value={status.connectionState} tone={status.online ? 'ok' : 'error'} />
        <StatusCard title="CAN" value={status.canStatus} />
        <StatusCard title="ZLAC" value={status.zlacStatus} />
        <StatusCard title="/odom 更新时间" value={status.lastOdomAgeSec ?? '-'} />
        <StatusCard title="/scan 更新时间" value={status.lastScanAgeSec ?? '-'} />
        <StatusCard title="当前任务" value={status.taskStatus} />
        <StatusCard title="建图状态" value={status.mappingStatus} />
        <StatusCard title="导航状态" value={status.nav2Status} />
        <StatusCard title="电量" value={status.batteryPercent ? `${status.batteryPercent}%` : '-'} />
        <StatusCard title="最后更新时间" value={new Date(status.timestamp).toLocaleTimeString()} />
      </View>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    backgroundColor: '#1f6feb',
    padding: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '800',
  },
  grid: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
});
