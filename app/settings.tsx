import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppButton } from '@/components/AppButton';
import { HelpText } from '@/components/HelpText';
import { PageContainer } from '@/components/PageContainer';
import { SectionCard } from '@/components/SectionCard';
import { StatusCard } from '@/components/StatusCard';
import type { RobotEndpoint, RobotEndpointKind } from '@/api/types';
import { robotActions, useRobotStore } from '@/store/robotStore';
import { colors, radius } from '@/theme/consoleTheme';
import { statusSourceText } from '@/utils/displayText';

const intervals = [{ value: 500, label: '流畅', note: '500ms' }, { value: 1000, label: '标准', note: '1000ms' }, { value: 2000, label: '省电', note: '2000ms' }] as const;
const endpointKinds: { value: RobotEndpointKind; label: string }[] = [
  { value: 'wifi', label: 'Wi-Fi 网络' },
  { value: 'ethernet', label: '5G 有线网络' },
  { value: 'manual', label: '手工地址' },
];

export default function SettingsPage() {
  const snapshot = useRobotStore((value) => value);
  const [refreshInterval, setRefreshInterval] = useState(snapshot.refreshIntervalMs);
  const [editingId, setEditingId] = useState<string>();
  const [draftLabel, setDraftLabel] = useState('手工地址');
  const [draftUrl, setDraftUrl] = useState('');
  const [draftKind, setDraftKind] = useState<RobotEndpointKind>('manual');

  const editEndpoint = (endpoint: RobotEndpoint) => {
    setEditingId(endpoint.id);
    setDraftLabel(endpoint.label);
    setDraftUrl(endpoint.url);
    setDraftKind(endpoint.kind);
  };
  const resetDraft = () => {
    setEditingId(undefined);
    setDraftLabel('手工地址');
    setDraftUrl('');
    setDraftKind('manual');
  };
  const saveDraft = () => {
    const current = snapshot.robotEndpoints.find((endpoint) => endpoint.id === editingId);
    const saved = robotActions.saveEndpoint({
      id: editingId ?? `draft:${Date.now()}`,
      label: draftLabel.trim() || endpointKinds.find((item) => item.value === draftKind)?.label || '机器人地址',
      url: draftUrl,
      kind: draftKind,
      enabled: current?.enabled ?? true,
      preferred: current?.preferred,
      lastSuccessAt: current?.lastSuccessAt,
      lastFailureAt: current?.lastFailureAt,
    });
    if (saved) resetDraft();
  };

  return <PageContainer title="连接设置" subtitle="管理多个机器人访问地址与状态刷新频率">
    <SectionCard title="连接模式" description="自动模式只用 GET /api/status 选择可达地址；控制请求不会跨地址重发。">
      <View style={styles.actions}>
        <AppButton label="自动选择可用地址" loading={snapshot.pending.connectPending} onPress={() => { robotActions.setConnectionMode('auto'); robotActions.connectRobot(); }} style={styles.action} />
        <AppButton label="手动固定地址" variant="secondary" disabled={!snapshot.activeEndpointId} onPress={() => robotActions.setConnectionMode('manual')} style={styles.action} />
      </View>
      <HelpText tone={snapshot.connectionMode === 'auto' ? 'success' : 'warning'}>
        当前模式：{snapshot.connectionMode === 'auto' ? '自动选择可用地址' : '手动固定当前地址'}
      </HelpText>
      {snapshot.endpointSwitchMessage ? <HelpText tone={snapshot.status.online ? 'success' : 'warning'}>{snapshot.endpointSwitchMessage}</HelpText> : null}
    </SectionCard>

    <SectionCard title="机器人访问地址" description="地址只允许 http:// 或 https://，不能包含 /api/status、查询参数、账号或 Token。">
      <View style={styles.list}>{snapshot.robotEndpoints.map((endpoint, index) => <View key={endpoint.id} style={styles.endpointCard}>
        <View style={styles.endpointHeader}>
          <Text style={styles.endpointTitle}>地址 {index + 1} · {endpoint.label}</Text>
          <Text style={[styles.endpointState, !endpoint.enabled && styles.disabledText]}>{endpoint.enabled ? '已启用' : '已禁用'}</Text>
        </View>
        <Text selectable style={styles.endpointUrl}>{endpoint.url}</Text>
        <Text style={styles.endpointMeta}>{endpoint.kind === 'wifi' ? 'Wi-Fi' : endpoint.kind === 'ethernet' ? '5G 有线' : '手工'}{endpoint.preferred ? ' · 首选' : ''}{endpoint.id === snapshot.activeEndpointId ? ' · 当前活动' : ''}</Text>
        <View style={styles.actions}>
          <AppButton label="编辑" variant="secondary" onPress={() => editEndpoint(endpoint)} style={styles.smallAction} />
          <AppButton label={endpoint.enabled ? '禁用' : '启用'} variant="secondary" onPress={() => robotActions.setEndpointEnabled(endpoint.id, !endpoint.enabled)} style={styles.smallAction} />
          <AppButton label="设为首选" variant="secondary" onPress={() => robotActions.setPreferredEndpoint(endpoint.id)} style={styles.smallAction} />
          <AppButton label="单独测试" variant="secondary" onPress={() => robotActions.testEndpoint(endpoint.id)} style={styles.smallAction} />
          <AppButton label="手动固定" variant="secondary" onPress={() => robotActions.activateEndpoint(endpoint.id)} style={styles.smallAction} />
          <AppButton label="删除" variant="ghost" onPress={() => robotActions.removeEndpoint(endpoint.id)} style={styles.smallAction} />
        </View>
      </View>)}</View>

      <View style={styles.editor}>
        <Text style={styles.label}>{editingId ? '编辑地址' : '添加地址'}</Text>
        <TextInput style={styles.input} value={draftLabel} onChangeText={setDraftLabel} placeholder="地址标签" placeholderTextColor={colors.textSubtle} />
        <TextInput accessibilityLabel="机器人服务地址" accessibilityHint="输入 mobile_bridge 的 HTTP 地址" style={styles.input} value={draftUrl} onChangeText={setDraftUrl} autoCapitalize="none" autoCorrect={false} placeholder="http://192.168.137.100:8000" placeholderTextColor={colors.textSubtle} />
        <View style={styles.options}>{endpointKinds.map((item) => <Pressable key={item.value} accessibilityRole="radio" accessibilityState={{ selected: draftKind === item.value }} onPress={() => setDraftKind(item.value)} style={[styles.option, draftKind === item.value && styles.optionSelected]}><Text style={[styles.optionLabel, draftKind === item.value && styles.optionLabelSelected]}>{item.label}</Text></Pressable>)}</View>
        <View style={styles.actions}><AppButton label={editingId ? '保存修改' : '添加地址'} onPress={saveDraft} style={styles.action} />{editingId ? <AppButton label="取消编辑" variant="ghost" onPress={resetDraft} style={styles.action} /> : null}</View>
      </View>
    </SectionCard>

    {snapshot.discoveredRobotEndpoints.length > 0 ? <SectionCard title="机器人发现了以下可用地址" description="点击导入后才会合并，不会覆盖手工地址或首选地址。">
      <View style={styles.list}>{snapshot.discoveredRobotEndpoints.map((endpoint) => <View key={endpoint.id} style={styles.discoveredRow}><Text style={styles.endpointTitle}>{endpoint.label}</Text><Text selectable style={styles.endpointUrl}>{endpoint.url}</Text></View>)}</View>
      <AppButton label="导入地址" onPress={() => robotActions.importDiscoveredEndpoints()} />
    </SectionCard> : null}

    <SectionCard title="状态刷新频率">
      <View style={styles.options}>{intervals.map((item) => <Pressable key={item.value} accessibilityRole="radio" accessibilityState={{ selected: refreshInterval === item.value }} onPress={() => setRefreshInterval(item.value)} style={[styles.option, refreshInterval === item.value && styles.optionSelected]}><Text style={[styles.optionLabel, refreshInterval === item.value && styles.optionLabelSelected]}>{item.label}</Text><Text style={styles.optionNote}>{item.note}</Text></Pressable>)}</View>
      <View style={styles.actions}><AppButton label="保存刷新频率" onPress={() => robotActions.saveSettings(snapshot.baseUrl, refreshInterval)} style={styles.action} /><AppButton label="测试实时连接" variant="secondary" onPress={() => robotActions.testWebSocket()} style={styles.action} /><AppButton label="恢复默认" variant="ghost" onPress={() => robotActions.restoreDefaults()} style={styles.action} /></View>
    </SectionCard>

    <SectionCard title="当前配置"><View style={styles.grid}><StatusCard title="活动机器人地址" value={snapshot.baseUrl} /><StatusCard title="状态来源" value={statusSourceText(snapshot.statusSource)} /><StatusCard title="刷新频率" value={intervals.find((item) => item.value === snapshot.refreshIntervalMs)?.label ?? `${snapshot.refreshIntervalMs}ms`} /></View></SectionCard>
    <HelpText tone="warning">底盘控制会向真实机器人发送请求。地址切换期间方向控制禁用，急停仍会向全部已知地址发送。</HelpText>
  </PageContainer>;
}

const styles = StyleSheet.create({
  list: { gap: 10 }, endpointCard: { gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 12, backgroundColor: colors.panelSoft }, endpointHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 }, endpointTitle: { flex: 1, fontWeight: '700', color: colors.text }, endpointState: { color: colors.success, fontWeight: '700' }, disabledText: { color: colors.textMuted }, endpointUrl: { color: colors.primary, fontSize: 13 }, endpointMeta: { color: colors.textMuted, fontSize: 12 }, editor: { gap: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }, discoveredRow: { gap: 4, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 8 },
  label: { fontWeight: '600', color: colors.text }, input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 12, backgroundColor: colors.input, color: colors.text }, options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, option: { minWidth: 96, minHeight: 48, flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.panelSoft }, optionSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft }, optionLabel: { color: colors.text, fontWeight: '600' }, optionLabelSelected: { color: colors.primary }, optionNote: { color: colors.textMuted, fontSize: 11, marginTop: 2 }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, action: { flex: 1, minWidth: 140 }, smallAction: { flexGrow: 1, minWidth: 96 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
