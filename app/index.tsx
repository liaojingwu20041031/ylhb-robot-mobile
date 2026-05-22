import { Link } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PageContainer } from '../src/components/PageContainer';
import { StatusCard } from '../src/components/StatusCard';
import { robotActions, useRobotStore } from '../src/store/robotStore';

const routes = [
  { href: '/dashboard', label: '进入状态面板' },
  { href: '/control', label: '进入手动控制' },
  { href: '/tasks', label: '进入零售任务' },
  { href: '/debug', label: '进入调试中心' },
  { href: '/logs', label: '进入日志' },
  { href: '/settings', label: '进入设置' },
] as const;

export default function IndexPage() {
  const { status, mockMode } = useRobotStore((snapshot) => ({
    status: snapshot.status,
    mockMode: snapshot.mockMode,
  }));

  return (
    <PageContainer title="YLHB Smart Retail Robot" subtitle="手机监控、控制和调试入口">
      <View style={styles.grid}>
        <StatusCard title="连接状态" value={status.connectionState} tone={status.online ? 'ok' : 'warn'} />
        <StatusCard title="当前模式" value={mockMode ? 'Mock' : 'Real Robot'} tone={mockMode ? 'warn' : 'ok'} />
      </View>
      <TouchableOpacity style={styles.refresh} onPress={() => robotActions.refreshStatus()}>
        <Text style={styles.refreshText}>刷新连接状态</Text>
      </TouchableOpacity>
      <View style={styles.menu}>
        {routes.map((route) => (
          <Link key={route.href} href={route.href} asChild>
            <TouchableOpacity style={styles.navButton}>
              <Text style={styles.navText}>{route.label}</Text>
            </TouchableOpacity>
          </Link>
        ))}
      </View>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  refresh: {
    borderRadius: 8,
    backgroundColor: '#1f6feb',
    padding: 14,
    alignItems: 'center',
  },
  refreshText: {
    color: '#fff',
    fontWeight: '800',
  },
  menu: {
    gap: 10,
  },
  navButton: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderColor: '#d0d7de',
    borderWidth: 1,
  },
  navText: {
    color: '#17202a',
    fontSize: 16,
    fontWeight: '700',
  },
});
