import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PageContainer } from '@/components/PageContainer';
import { SectionCard } from '@/components/SectionCard';
import { colors, radius } from '@/theme/consoleTheme';

const items = [
  { href: '/status', icon: 'pulse-outline', title: '设备状态', description: '连接、设备、传感器与服务状态' },
  { href: '/logs', icon: 'document-text-outline', title: '运行日志', description: '查看操作、警告、错误和接口记录' },
  { href: '/settings', icon: 'settings-outline', title: '连接设置', description: '机器人地址、刷新频率与连接测试' },
] as const;

export default function MorePage() {
  return (
    <PageContainer title="更多" subtitle="设备信息、日志与应用设置">
      <SectionCard title="工具"><View style={styles.list}>{items.map((item) => (
        <Link key={item.href} href={item.href} asChild>
          <Pressable accessibilityRole="button" accessibilityLabel={item.title} accessibilityHint={item.description} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
            <View style={styles.icon}><Ionicons name={item.icon} size={22} color={colors.primary} /></View>
            <View style={styles.copy}><Text style={styles.title}>{item.title}</Text><Text style={styles.description}>{item.description}</Text></View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
          </Pressable>
        </Link>
      ))}</View></SectionCard>
      <SectionCard title="关于应用" description="机器人控制中心 · 移动机器人现场控制与建图工具">
        <Text style={styles.about}>应用仅通过 mobile_bridge 的 HTTP/WebSocket 与机器人通信，不直接连接 ROS2 DDS。</Text>
      </SectionCard>
    </PageContainer>
  );
}

const styles = StyleSheet.create({ list: { gap: 8 }, row: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: radius.sm }, pressed: { backgroundColor: colors.primarySoft }, icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft }, copy: { flex: 1, gap: 3 }, title: { color: colors.text, fontSize: 16, fontWeight: '700' }, description: { color: colors.textMuted, fontSize: 13 }, about: { color: colors.textMuted, lineHeight: 21 } });
