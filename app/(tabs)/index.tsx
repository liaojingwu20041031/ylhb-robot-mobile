import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '@/components/AppButton';
import { PageContainer } from '@/components/PageContainer';
import { SectionCard } from '@/components/SectionCard';
import { StatusBadge } from '@/components/StatusBadge';
import { StatusCard } from '@/components/StatusCard';
import { robotActions, useRobotStore } from '@/store/robotStore';
import { colors, radius } from '@/theme/consoleTheme';
import { booleanStateText, connectionStateText, mappingStateText, maskRobotAddress, processStateText, statusSourceText } from '@/utils/displayText';
import { stateTone } from '@/utils/status';

const shortcuts = [
  { href: '/control', icon: 'game-controller-outline', title: '底盘控制', description: '低速点动与紧急停止' },
  { href: '/mapping', icon: 'map-outline', title: '开始建图', description: '实时查看并保存地图' },
  { href: '/maps', icon: 'layers-outline', title: '地图管理', description: '预览与管理地图文件' },
  { href: '/status', icon: 'pulse-outline', title: '设备状态', description: '查看设备与传感器' },
] as const;

export default function HomePage() {
  const { baseUrl, status, debugStatus, systemStatus, mappingStatus, statusSource, pending } = useRobotStore((snapshot) => ({
    baseUrl: snapshot.baseUrl, status: snapshot.status, debugStatus: snapshot.debugStatus, systemStatus: snapshot.systemStatus,
    mappingStatus: snapshot.mappingStatus, statusSource: snapshot.statusSource, pending: snapshot.pending,
  }));
  useEffect(() => { robotActions.startStatusSocket(); robotActions.refreshStatusBundle(); }, []);
  return (
    <PageContainer title="机器人控制中心" subtitle="移动机器人现场控制与建图工具" showSafetyBar>
      <SectionCard title="机器人连接" description={maskRobotAddress(baseUrl)} summary={<StatusBadge label={connectionStateText(status.connectionState)} tone={stateTone(status.connectionState)} />}>
        <View style={styles.connectionMeta}><Text style={styles.metaLabel}>状态来源</Text><Text style={styles.metaValue}>{statusSourceText(statusSource)}</Text></View>
        <View style={styles.actions}>
          <AppButton label={status.online ? '刷新状态' : '连接机器人'} loading={pending.connectPending || pending.statusPending} onPress={() => status.online ? robotActions.refreshStatusBundle(true) : robotActions.connectRobot()} style={styles.action} />
          <Link href="/settings" asChild><AppButton label="连接设置" variant="secondary" style={styles.action} /></Link>
        </View>
      </SectionCard>
      <SectionCard title="快捷操作"><View style={styles.shortcutGrid}>{shortcuts.map((item) => (
        <Link key={item.href} href={item.href} asChild>
          <Pressable accessibilityRole="button" accessibilityLabel={item.title} accessibilityHint={item.description} hitSlop={4} android_ripple={{ color: colors.primarySoft }} style={({ pressed }) => [styles.shortcut, pressed && styles.pressed]}>
            <View style={styles.iconBox}><Ionicons name={item.icon} size={24} color={colors.primary} /></View>
            <View style={styles.shortcutCopy}><Text style={styles.shortcutTitle}>{item.title}</Text><Text style={styles.shortcutDescription}>{item.description}</Text></View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
          </Pressable>
        </Link>
      ))}</View></SectionCard>
      <SectionCard title="关键状态" description="详细设备信息可在“设备状态”中查看。"><View style={styles.statusGrid}>
        <StatusCard title="基础驱动" value={processStateText(systemStatus?.bringup?.running)} technicalLabel="bringup" />
        <StatusCard title="运动控制" value={booleanStateText(debugStatus?.topics?.['/cmd_vel'])} technicalLabel="/cmd_vel" />
        <StatusCard title="激光雷达" value={booleanStateText(debugStatus?.topics?.['/scan'])} technicalLabel="/scan" />
        <StatusCard title="建图服务" value={mappingStateText(mappingStatus?.mappingStatus ?? status.mappingStatus)} technicalLabel="mapping" />
      </View></SectionCard>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  connectionMeta: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 }, metaLabel: { color: colors.textMuted, fontSize: 13 }, metaValue: { color: colors.text, fontSize: 13, fontWeight: '600' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, action: { flex: 1, minWidth: 140 }, shortcutGrid: { gap: 10 },
  shortcut: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.sm, backgroundColor: colors.panelSoft }, pressed: { opacity: 0.72 },
  iconBox: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft }, shortcutCopy: { flex: 1, gap: 3 },
  shortcutTitle: { color: colors.text, fontSize: 16, fontWeight: '700' }, shortcutDescription: { color: colors.textMuted, fontSize: 13 }, statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
