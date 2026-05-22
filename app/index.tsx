import { Link } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FreshnessBadge } from '../src/components/FreshnessBadge';
import { HelpText } from '../src/components/HelpText';
import { PageContainer } from '../src/components/PageContainer';
import { SectionCard } from '../src/components/SectionCard';
import { StatusBadge } from '../src/components/StatusBadge';
import { StatusCard } from '../src/components/StatusCard';
import { colors } from '../src/theme/consoleTheme';
import { buildNextStep, stateTone, textOrUnknown } from '../src/utils/status';
import { robotActions, useRobotStore } from '../src/store/robotStore';

const routes = [
  { href: '/dashboard', title: '状态监控', description: '查看 ROS2 链路、新鲜度和状态来源。' },
  { href: '/control', title: '底盘控制', description: '低速点动测试，含控制锁和急停。' },
  { href: '/tasks', title: '零售任务', description: '发送区域移动和商品取货中文命令。' },
  { href: '/debug', title: '调试中心', description: '建图、导航、底盘和任务层专项检查。' },
  { href: '/logs', title: '系统日志', description: '复制错误、API 和用户操作日志。' },
  { href: '/settings', title: '连接设置', description: '配置 Jetson 地址、Mock/真机和刷新策略。' },
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
    <PageContainer title="YLHB 智慧零售机器人" subtitle="手机工程控制台">
      <SectionCard
        title="运行总览"
        description="第一屏集中显示关键链路。未知字段会显示为未知，不会假装正常。"
        summary={<StatusBadge label={mockMode ? 'Mock Mode' : 'Real Robot Mode'} tone={mockMode ? 'warning' : 'danger'} />}
      >
        <View style={styles.grid}>
          <StatusCard title="当前模式" value={mockMode ? 'Mock Mode' : 'Real Robot Mode'} tone={mockMode ? 'warning' : 'danger'} />
          <StatusCard title="Bridge" value={status.connectionState} tone={stateTone(status.connectionState)} />
          <StatusCard title="ZLAC" value={status.zlacStatus} tone={stateTone(status.zlacStatus)} />
          <View style={styles.freshCard}>
            <Text style={styles.freshTitle}>/scan</Text>
            <FreshnessBadge age={status.lastScanAgeSec} />
          </View>
          <View style={styles.freshCard}>
            <Text style={styles.freshTitle}>/odom</Text>
            <FreshnessBadge age={status.lastOdomAgeSec} />
          </View>
          <StatusCard title="system_mode" value={status.systemMode} />
          <StatusCard title="task_status" value={status.taskStatus} />
          <StatusCard title="mapping" value={status.mappingStatus} />
          <StatusCard title="navigation" value={status.nav2Status} />
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

      <SectionCard title="下一步建议" description="根据 Bridge、传感器、地图和导航状态自动给出验收建议。">
        <HelpText tone="info">{buildNextStep(status, debugStatus)}</HelpText>
        <Text style={styles.smallText} selectable>
          当前 task_status：{textOrUnknown(status.taskStatus)}
        </Text>
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
  freshCard: {
    flex: 1,
    minWidth: 142,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    gap: 8,
  },
  freshTitle: {
    color: colors.textMuted,
    fontWeight: '800',
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
  smallText: {
    color: colors.textMuted,
    fontSize: 12,
  },
});
