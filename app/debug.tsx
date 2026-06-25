import { Link } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PageContainer } from '../src/components/PageContainer';
import { SectionCard } from '../src/components/SectionCard';
import { colors } from '../src/theme/consoleTheme';

const links = [
  { href: '/status', title: '状态检查', description: '检查 Bridge、话题、TF、进程、建图和 Nav2。' },
  { href: '/control', title: '底盘低速控制', description: '真实机器人点动、零速度停止和急停。' },
  { href: '/mapping', title: '建图调试', description: '启动建图、预览地图、低速移动并保存。' },
  { href: '/maps', title: '地图管理', description: '查看、重命名和删除地图文件。' },
  { href: '/logs', title: '日志', description: '查看现场调试请求和错误。' },
] as const;

export default function DebugPage() {
  return (
    <PageContainer title="调试入口" subtitle="智能机器人调试页索引。">
      <SectionCard title="可用工具" description="旧的堆叠调试页已拆成独立流程页面。">
        <View style={styles.menu}>
          {links.map((link) => (
            <Link key={link.href} href={link.href} asChild>
              <TouchableOpacity style={styles.navButton}>
                <Text style={styles.navTitle}>{link.title}</Text>
                <Text style={styles.navDescription}>{link.description}</Text>
              </TouchableOpacity>
            </Link>
          ))}
        </View>
      </SectionCard>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
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
