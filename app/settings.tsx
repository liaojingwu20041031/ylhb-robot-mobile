import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { AppButton } from '@/components/AppButton';
import { HelpText } from '@/components/HelpText';
import { PageContainer } from '@/components/PageContainer';
import { SectionCard } from '@/components/SectionCard';
import { StatusCard } from '@/components/StatusCard';
import { robotActions, useRobotStore } from '@/store/robotStore';
import { colors, radius } from '@/theme/consoleTheme';
import { statusSourceText } from '@/utils/displayText';

const intervals = [
  { value: 1000, label: '快速', note: '1000ms' },
  { value: 3000, label: '标准', note: '3000ms' },
  { value: 5000, label: '省电', note: '5000ms' },
] as const;

export default function SettingsPage() {
  const snapshot = useRobotStore((value) => value);
  const [primaryUrl, setPrimaryUrl] = useState(snapshot.connectionConfig.primaryUrl);
  const [fallbackUrl, setFallbackUrl] = useState(snapshot.connectionConfig.fallbackUrl ?? '');
  const [autoFailover, setAutoFailover] = useState(snapshot.connectionConfig.autoFailover);
  const [refreshIntervalMs, setRefreshIntervalMs] = useState(snapshot.refreshIntervalMs);

  useEffect(() => {
    setPrimaryUrl(snapshot.connectionConfig.primaryUrl);
    setFallbackUrl(snapshot.connectionConfig.fallbackUrl ?? '');
    setAutoFailover(snapshot.connectionConfig.autoFailover);
    setRefreshIntervalMs(snapshot.connectionConfig.refreshIntervalMs);
  }, [
    snapshot.connectionConfig.primaryUrl,
    snapshot.connectionConfig.fallbackUrl,
    snapshot.connectionConfig.autoFailover,
    snapshot.connectionConfig.refreshIntervalMs,
  ]);

  const saveAndConnect = () => robotActions.saveConnectionConfigAndConnect({
    primaryUrl,
    fallbackUrl: fallbackUrl.trim() || undefined,
    autoFailover,
    refreshIntervalMs,
  });

  return <PageContainer title="连接设置" subtitle="配置一台机器人的主地址和备用地址">
    <SectionCard title="机器人地址" description="只填写 http:// 或 https:// 根地址，不要包含 /api/status、查询参数或账号。">
      <Text style={styles.label}>主地址</Text>
      <TextInput accessibilityLabel="机器人主地址" style={styles.input} value={primaryUrl} onChangeText={setPrimaryUrl} autoCapitalize="none" autoCorrect={false} placeholder="http://192.168.137.100:8000" placeholderTextColor={colors.textSubtle} />
      <Text style={styles.label}>备用地址（可选）</Text>
      <TextInput accessibilityLabel="机器人备用地址" style={styles.input} value={fallbackUrl} onChangeText={setFallbackUrl} autoCapitalize="none" autoCorrect={false} placeholder="http://192.168.8.20:8000" placeholderTextColor={colors.textSubtle} />
      <View style={styles.switchRow}>
        <View style={styles.switchCopy}><Text style={styles.label}>自动切换</Text><Text style={styles.note}>仅 timeout 或 network_error 才尝试备用地址</Text></View>
        <Switch value={autoFailover} onValueChange={setAutoFailover} />
      </View>
      <View style={styles.actions}>
        <AppButton label="保存并连接" loading={snapshot.pending.connectPending} onPress={saveAndConnect} style={styles.action} />
        <AppButton label="测试主地址" variant="secondary" onPress={() => robotActions.testConnectionEndpoint('primary')} style={styles.action} />
        <AppButton label="测试备用地址" variant="secondary" disabled={!fallbackUrl.trim()} onPress={() => robotActions.testConnectionEndpoint('fallback')} style={styles.action} />
        <AppButton label="主备地址交换" variant="secondary" disabled={!fallbackUrl.trim()} onPress={() => { setPrimaryUrl(fallbackUrl); setFallbackUrl(primaryUrl); }} style={styles.action} />
        <AppButton label="恢复默认" variant="ghost" onPress={() => robotActions.restoreDefaults()} style={styles.action} />
      </View>
      {snapshot.endpointSwitchMessage ? <HelpText tone={snapshot.status.online ? 'success' : 'warning'}>{snapshot.endpointSwitchMessage}</HelpText> : null}
    </SectionCard>

    <SectionCard title="状态刷新频率" description="只改变状态轮询周期，不修改地址、不关闭连接。">
      <View style={styles.options}>{intervals.map((item) => <Pressable key={item.value} accessibilityRole="radio" accessibilityState={{ selected: refreshIntervalMs === item.value }} onPress={() => setRefreshIntervalMs(item.value)} style={[styles.option, refreshIntervalMs === item.value && styles.optionSelected]}><Text style={[styles.optionLabel, refreshIntervalMs === item.value && styles.optionLabelSelected]}>{item.label}</Text><Text style={styles.optionNote}>{item.note}</Text></Pressable>)}</View>
      <AppButton label="保存刷新频率" onPress={() => robotActions.setRefreshInterval(refreshIntervalMs)} />
    </SectionCard>

    <SectionCard title="当前连接"><View style={styles.grid}>
      <StatusCard title="活动地址" value={snapshot.baseUrl} />
      <StatusCard title="连接阶段" value={snapshot.connectionPhase} />
      <StatusCard title="状态来源" value={statusSourceText(snapshot.statusSource)} />
    </View></SectionCard>
    <HelpText tone="warning">地址类型由机器人诊断返回，无需手工维护。普通连接、刷新和地址测试不会发送急停。</HelpText>
  </PageContainer>;
}

const styles = StyleSheet.create({
  label: { fontWeight: '600', color: colors.text },
  note: { color: colors.textMuted, fontSize: 12 },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 12, backgroundColor: colors.input, color: colors.text },
  switchRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  switchCopy: { flex: 1, gap: 3 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { minWidth: 96, minHeight: 48, flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.panelSoft },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optionLabel: { color: colors.text, fontWeight: '600' },
  optionLabelSelected: { color: colors.primary },
  optionNote: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  action: { flex: 1, minWidth: 140 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
