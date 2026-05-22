import { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { PageContainer } from '../src/components/PageContainer';
import { ChassisTestPanel } from '../src/components/debug/ChassisTestPanel';
import { DebugLogPanel } from '../src/components/debug/DebugLogPanel';
import { DebugStatusCard } from '../src/components/debug/DebugStatusCard';
import { MappingTestPanel } from '../src/components/debug/MappingTestPanel';
import { NavigationTestPanel } from '../src/components/debug/NavigationTestPanel';
import { robotActions, useRobotStore } from '../src/store/robotStore';

export default function DebugPage() {
  const debugStatus = useRobotStore((snapshot) => snapshot.debugStatus);

  useEffect(() => {
    robotActions.refreshDebugStatus();
  }, []);

  return (
    <PageContainer title="调试中心" subtitle="系统检查、底盘、建图、导航和调试日志">
      <TouchableOpacity style={styles.button} onPress={() => robotActions.refreshDebugStatus()}>
        <Text style={styles.buttonText}>刷新系统检查</Text>
      </TouchableOpacity>
      <DebugStatusCard status={debugStatus} />
      <ChassisTestPanel />
      <MappingTestPanel />
      <NavigationTestPanel />
      <DebugLogPanel />
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
});
