import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppButton } from '@/components/AppButton';
import { HelpText } from '@/components/HelpText';
import { PageContainer } from '@/components/PageContainer';
import { SectionCard } from '@/components/SectionCard';
import { StatusCard } from '@/components/StatusCard';
import { robotActions, useRobotStore } from '@/store/robotStore';
import { colors, radius } from '@/theme/consoleTheme';
import { errorDisplayText, statusSourceText } from '@/utils/displayText';

const intervals = [{ value: 500, label: '流畅', note: '500ms' }, { value: 1000, label: '标准', note: '1000ms' }, { value: 2000, label: '省电', note: '2000ms' }] as const;

export default function SettingsPage() {
  const snapshot = useRobotStore((v) => v);
  const [baseUrl, setBaseUrl] = useState(snapshot.baseUrl);
  const [refreshInterval, setRefreshInterval] = useState(snapshot.refreshIntervalMs);
  useEffect(() => { setBaseUrl(snapshot.baseUrl); setRefreshInterval(snapshot.refreshIntervalMs); }, [snapshot.baseUrl, snapshot.refreshIntervalMs]);
  return <PageContainer title="连接设置" subtitle="配置机器人服务地址与状态刷新频率">
    <SectionCard title="机器人连接" description="保存后会立即尝试连接机器人。">
      <View style={styles.inputBox}><Text style={styles.label}>机器人服务地址</Text><TextInput accessibilityLabel="机器人服务地址" accessibilityHint="输入 mobile_bridge 的 HTTP 地址" style={styles.input} value={baseUrl} onChangeText={setBaseUrl} autoCapitalize="none" autoCorrect={false} placeholder="http://192.168.137.100:8000" placeholderTextColor={colors.textSubtle} /></View>
      <View style={styles.inputBox}><Text style={styles.label}>状态刷新频率</Text><View style={styles.options}>{intervals.map((item) => <Pressable key={item.value} accessibilityRole="radio" accessibilityState={{ selected: refreshInterval === item.value }} onPress={() => setRefreshInterval(item.value)} style={[styles.option, refreshInterval === item.value && styles.optionSelected]}><Text style={[styles.optionLabel, refreshInterval === item.value && styles.optionLabelSelected]}>{item.label}</Text><Text style={styles.optionNote}>{item.note}</Text></Pressable>)}</View></View>
      <HelpText tone="warning">底盘控制会向真实机器人发送运动和停止请求，操作前请确认周围安全。</HelpText>
      <View style={styles.actions}><AppButton label="保存并连接" loading={snapshot.pending.connectPending} onPress={() => robotActions.saveSettingsAndConnect(baseUrl, refreshInterval)} style={styles.action} /><AppButton label="测试基础连接" variant="secondary" loading={snapshot.pending.statusPending} onPress={() => robotActions.testHttpConnection()} style={styles.action} /><AppButton label="测试实时连接" variant="secondary" onPress={() => robotActions.testWebSocket()} style={styles.action} /><AppButton label="恢复默认" variant="ghost" onPress={() => robotActions.restoreDefaults()} style={styles.action} /></View>
      {snapshot.httpTest ? <HelpText tone={snapshot.httpTest.ok ? 'success' : 'danger'}>基础连接：{snapshot.httpTest.ok ? '连接正常' : errorDisplayText(snapshot.httpTest.message)}</HelpText> : null}
      {snapshot.websocketTest ? <HelpText tone={snapshot.websocketTest.ok ? 'success' : 'danger'}>实时连接：{snapshot.websocketTest.ok ? '已发起连接，请观察状态来源' : errorDisplayText(snapshot.websocketTest.message)}</HelpText> : null}
    </SectionCard>
    <SectionCard title="当前配置"><View style={styles.grid}><StatusCard title="机器人服务地址" value={snapshot.baseUrl} /><StatusCard title="状态来源" value={statusSourceText(snapshot.statusSource)} /><StatusCard title="刷新频率" value={intervals.find((i) => i.value === snapshot.refreshIntervalMs)?.label ?? `${snapshot.refreshIntervalMs}ms`} /></View></SectionCard>
  </PageContainer>;
}
const styles = StyleSheet.create({ inputBox: { gap: 7 }, label: { fontWeight: '600', color: colors.text }, input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 12, backgroundColor: colors.input, color: colors.text }, options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, option: { minWidth: 96, minHeight: 58, flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.panelSoft }, optionSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft }, optionLabel: { color: colors.text, fontWeight: '600' }, optionLabelSelected: { color: colors.primary }, optionNote: { color: colors.textMuted, fontSize: 11, marginTop: 2 }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, action: { flex: 1, minWidth: 140 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 } });
