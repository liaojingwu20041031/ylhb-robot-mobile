import { useEffect } from 'react';
import { ChassisTestPanel } from '../src/components/debug/ChassisTestPanel';
import { DebugLogPanel } from '../src/components/debug/DebugLogPanel';
import { DebugStatusCard } from '../src/components/debug/DebugStatusCard';
import { MappingTestPanel } from '../src/components/debug/MappingTestPanel';
import { SystemProcessPanel } from '../src/components/debug/SystemProcessPanel';
import { PageContainer } from '../src/components/PageContainer';
import { robotActions, useRobotStore } from '../src/store/robotStore';

export default function DebugPage() {
  const debugStatus = useRobotStore((snapshot) => snapshot.debugStatus);

  useEffect(() => {
    robotActions.refreshStatus();
    robotActions.refreshSystemStatus();
    robotActions.refreshDebugStatus();
    robotActions.mappingStatus();
  }, []);

  return (
    <PageContainer title="APP 调试端" subtitle="电力巡检机器人现场调试：连接、系统进程、底盘低速测试、建图与地图保存。">
      <SystemProcessPanel />
      <DebugStatusCard status={debugStatus} />
      <ChassisTestPanel />
      <MappingTestPanel />
      <DebugLogPanel />
    </PageContainer>
  );
}
