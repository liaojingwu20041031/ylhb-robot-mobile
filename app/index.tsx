import { Link } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { HelpText } from '../src/components/HelpText';
import { PageContainer } from '../src/components/PageContainer';
import { SectionCard } from '../src/components/SectionCard';
import { StatusBadge } from '../src/components/StatusBadge';
import { StatusCard } from '../src/components/StatusCard';
import { colors } from '../src/theme/consoleTheme';
import { buildNextStep, stateTone } from '../src/utils/status';
import { robotActions, useRobotStore } from '../src/store/robotStore';

const routes = [
  { href: '/debug', title: 'APP 调试端', description: '启动底盘、低速点动、建图、地图预览与保存。' },
  { href: '/control', title: '底盘控制', description: '按 /odom、/scan、/imu/data 与 TF 锁定低速方向按钮。' },
  { href: '/dashboard', title: '系统状态', description: 'Bridge、ROS 话题、节点和数据新鲜度总览。' },
  { href: '/logs', title: '系统日志', description: '查看 API、错误和用户操作日志。' },
  { href: '/settings', title: '连接设置', description: '配置 Jetson Base URL、Mock/真机和 WebSocket。' },
] as const;

export default function IndexPage() {
  const { status, mockMode, debugStatus } = useRobotStore((snapshot) => ({
    status: snapshot.status,
    mockMode: snapshot.mockMode,
    debugStatus: snapshot.debugStatus,
  }));

  useEffect(() => {
    robotActions.refreshStatus();
    robotActions.refreshDebugStatus();
  }, []);

  return (
    <PageContainer title="电力巡检机器人" subtitle="面向 mobile_bridge 的现场调试控制台">
      <SectionCard
        title="运行总览"
        description="第一屏集中显示连接、模式与系统总体健康；调试流程优先进入「APP 调试端」。"
        summary={<StatusBadge label={mockMode ? 'Mock Mode' : 'Real Robot Mode'} tone={mockMode ? 'warning' : 'danger'} />}
      >
        <View style={styles.grid}>
          <StatusCard title="当前模式" value={mockMode ? 'Mock Mode' : 'Real Robot Mode'} tone={mockMode ? 'warning' : 'danger'} />
          <StatusCard title="Bridge" value={status.connectionState} tone={stateTone(status.connectionState)} />
          <StatusCard title="系统总体健康" value={status.online ? '在线' : '离线'} tone={status.online ? 'success' : 'danger'} />
        </View>
      </SectionCard>

      <SectionCard title="控制台入口" description="所有入口均保留中文说明，适合验收时快速定位功能。">
        <View style={styles.menu}>
          {routes.map((route) => (
            <Link key={route.href} href={route.href} asChild>
              <TouchableOpacity style={styles.navButton}>
                <Text style={styles.navTitle}>{route.title}</Text>
                <Text style={styles.navDescription}>{route.description}</Text>
              </TouchableOpacity>
            </Link>
          ))}
        </View>
      </SectionCard>

      <SectionCard title="下一步建议" description="根据 Bridge、传感器、底盘和建图状态自动给出调试建议。">
        <HelpText tone="info">{buildNextStep(status, debugStatus)}</HelpText>
      </SectionCard>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  menu: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  navButton: {
    flex: 1,
    minWidth: 150,
    minHeight: 82,
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.bgElevated,
    borderColor: colors.border,
    borderWidth: 1,
    gap: 6,
  },
  navTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  navDescription: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
});
