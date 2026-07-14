import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '@/components/AppButton';
import { FreshnessBadge } from '@/components/FreshnessBadge';
import { HelpText } from '@/components/HelpText';
import { PageContainer } from '@/components/PageContainer';
import { SectionCard } from '@/components/SectionCard';
import { StatusBadge } from '@/components/StatusBadge';
import { StatusCard } from '@/components/StatusCard';
import { robotActions, useRobotStore } from '@/store/robotStore';
import { colors } from '@/theme/consoleTheme';
import { booleanStateText, connectionStateText, mappingStateText, navigationStateText, processStateText, statusSourceText } from '@/utils/displayText';
import { buildDiagnostics, freshnessTone, stateTone } from '@/utils/status';

export default function StatusPage() {
  const { status, debugStatus, systemStatus, mappingStatus, statusSource, pending, refreshIntervalMs } = useRobotStore((s) => ({ status: s.status, debugStatus: s.debugStatus, systemStatus: s.systemStatus, mappingStatus: s.mappingStatus, statusSource: s.statusSource, pending: s.pending, refreshIntervalMs: s.refreshIntervalMs }));
  useEffect(() => { robotActions.startStatusSocket(); robotActions.refreshStatusBundle(); const timer = setInterval(() => robotActions.refreshStatusBundle(), refreshIntervalMs); return () => clearInterval(timer); }, [refreshIntervalMs]);
  const topic = (name: string) => debugStatus?.topics?.[name]; const node = (name: string) => debugStatus?.nodes?.[name]; const diagnostics = buildDiagnostics(status, debugStatus);
  return <PageContainer title="设备状态" subtitle="查看机器人连接、基础设备、传感器和服务状态">
    <SectionCard title="连接状态" summary={<StatusBadge label={statusSourceText(statusSource)} tone={statusSource === '未知' ? 'neutral' : 'info'} />} actions={<View style={styles.actions}><AppButton label="立即刷新" loading={pending.statusPending} onPress={() => robotActions.refreshStatusBundle(true)} style={styles.action} /><AppButton label="复制状态报告" variant="secondary" loading={pending.copyPending} onPress={() => robotActions.copyStatusReport()} style={styles.action} /></View>}><View style={styles.grid}><StatusCard title="机器人连接" value={connectionStateText(status.connectionState)} technicalLabel="connection" tone={stateTone(status.connectionState)} /><StatusCard title="服务在线" value={booleanStateText(status.online)} technicalLabel="online" /></View></SectionCard>
    <Group title="基础设备"><StatusCard title="底盘电机驱动" value={processStateText(status.zlacStatus ?? debugStatus?.zlacStatus)} technicalLabel="ZLAC" /><StatusCard title="底盘通信总线" value={processStateText(status.canStatus)} technicalLabel="CAN" /><StatusCard title="基础驱动" value={processStateText(systemStatus?.bringup?.running)} technicalLabel="bringup" /><StatusCard title="运动指令通道" value={booleanStateText(topic('/cmd_vel'))} technicalLabel="/cmd_vel" /></Group>
    <Group title="传感器"><FreshMetric title="里程计" technical="/odom" value={topic('/odom')} age={status.lastOdomAgeSec ?? debugStatus?.lastOdomAgeSec} /><FreshMetric title="激光雷达" technical="/scan" value={topic('/scan')} age={status.lastScanAgeSec ?? debugStatus?.lastScanAgeSec} /><FreshMetric title="姿态传感器" technical="/imu/data" value={topic('/imu/data')} age={debugStatus?.lastImuAgeSec} /><StatusCard title="坐标变换" value={booleanStateText(node('tf'))} technicalLabel="TF" /></Group>
    <Group title="建图与导航"><StatusCard title="建图服务" value={mappingStateText(mappingStatus?.mappingStatus ?? status.mappingStatus)} technicalLabel="mapping" /><StatusCard title="建图引擎" value={booleanStateText(node('slam_toolbox'))} technicalLabel="slam_toolbox" /><FreshMetric title="地图数据" technical="/map" value={topic('/map')} age={mappingStatus?.lastMapAgeSec ?? debugStatus?.lastMapAgeSec} /><StatusCard title="导航系统" value={navigationStateText(status.nav2Status ?? debugStatus?.nav2Status)} technicalLabel="Nav2" /></Group>
    {diagnostics.length ? <SectionCard title="异常与提醒">{diagnostics.map((tip) => <HelpText key={tip} tone="warning">{tip}</HelpText>)}</SectionCard> : null}
  </PageContainer>;
}
function Group({ title, children }: { title: string; children: React.ReactNode }) { return <SectionCard title={title}><View style={styles.grid}>{children}</View></SectionCard>; }
function FreshMetric({ title, technical, value, age }: { title: string; technical: string; value?: boolean; age?: number | null }) { return <View style={[styles.fresh, freshnessTone(age) === 'danger' && styles.freshDanger]}><View style={styles.freshHeader}><View><Text style={styles.freshTitle}>{title}</Text><Text style={styles.technical}>{technical}</Text></View><StatusBadge label={booleanStateText(value)} tone={stateTone(value)} /></View><FreshnessBadge age={age ?? undefined} /></View>; }
const styles = StyleSheet.create({ actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, action: { flex: 1, minWidth: 138 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, fresh: { flex: 1, minWidth: 150, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.panel, gap: 9 }, freshDanger: { borderColor: colors.danger }, freshHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 }, freshTitle: { color: colors.text, fontWeight: '600' }, technical: { color: colors.textSubtle, fontSize: 11, marginTop: 3 } });
