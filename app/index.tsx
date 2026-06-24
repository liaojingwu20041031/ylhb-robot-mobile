import { Link } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AppButton } from '../src/components/AppButton';
import { HelpText } from '../src/components/HelpText';
import { PageContainer } from '../src/components/PageContainer';
import { SectionCard } from '../src/components/SectionCard';
import { StatusBadge } from '../src/components/StatusBadge';
import { StatusCard } from '../src/components/StatusCard';
import { colors } from '../src/theme/consoleTheme';
import { buildNextStep, stateTone } from '../src/utils/status';
import { robotActions, useRobotStore } from '../src/store/robotStore';
import { useState } from 'react';

const routes = [
  { href: '/status', title: '状态检查', description: 'Bridge、话题、TF、进程、建图和 Nav2 状态。' },
  { href: '/control', title: '底盘低速控制', description: '真实 /cmd_vel 点动、零速度停止和急停。' },
  { href: '/mapping', title: '建图调试', description: '启动底层、启动建图、看地图增长并保存。' },
  { href: '/logs', title: '日志', description: '查看请求、错误和现场操作记录。' },
  { href: '/settings', title: '设置', description: '保存 Jetson Base URL 和刷新间隔。' },
] as const;

export default function IndexPage() {
  const { baseUrl, status, debugStatus, statusSource, pending } = useRobotStore((snapshot) => ({
    baseUrl: snapshot.baseUrl,
    status: snapshot.status,
    debugStatus: snapshot.debugStatus,
    statusSource: snapshot.statusSource,
    pending: snapshot.pending,
  }));
  const [draftUrl, setDraftUrl] = useState(baseUrl);

  useEffect(() => {
    setDraftUrl(baseUrl);
  }, [baseUrl]);

  return (
    <PageContainer title="智能机器人调试" subtitle="只连接 ylhb_mobile_bridge，不使用演示数据。">
      <SectionCard
        title="连接机器人"
        description="输入 Jetson bridge 地址后连接真实机器人。连接会依次检查 /api/status、/api/debug/status、/api/debug/system/status、/api/debug/mapping/status。"
        summary={<StatusBadge label={statusSource} tone={statusSource === '未知' ? 'neutral' : 'info'} />}
      >
        <View style={styles.inputBox}>
          <Text style={styles.label}>Jetson Base URL</Text>
          <TextInput
            style={styles.input}
            value={draftUrl}
            onChangeText={setDraftUrl}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="http://192.168.137.100:8000"
            placeholderTextColor={colors.textSubtle}
          />
        </View>
        <View style={styles.actions}>
          <AppButton
            label="连接机器人"
            loading={pending.connectPending}
            onPress={() => robotActions.saveSettingsAndConnect(draftUrl)}
            style={styles.action}
          />
          <AppButton
            label="刷新状态"
            variant="secondary"
            loading={pending.statusPending}
            onPress={() => robotActions.refreshStatusBundle(true)}
            style={styles.action}
          />
        </View>
        <View style={styles.grid}>
          <StatusCard title="Bridge" value={status.connectionState} tone={stateTone(status.connectionState)} />
          <StatusCard title="在线" value={status.online} tone={stateTone(status.online)} />
          <StatusCard title="/cmd_vel" value={debugStatus?.topics?.['/cmd_vel']} tone={stateTone(debugStatus?.topics?.['/cmd_vel'])} />
          <StatusCard title="ZLAC" value={status.zlacStatus ?? debugStatus?.zlacStatus} />
        </View>
      </SectionCard>

      <SectionCard title="主流程入口" description="现场调试只保留连接、状态检查、底盘低速控制、建图和日志。">
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

      <SectionCard title="下一步建议" description="根据真实状态给出当前最该检查的环节。">
        <HelpText tone="info">{buildNextStep(status, debugStatus)}</HelpText>
      </SectionCard>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  inputBox: {
    gap: 6,
  },
  label: {
    fontWeight: '900',
    color: colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: colors.input,
    color: colors.text,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  action: {
    flex: 1,
    minWidth: 140,
  },
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
