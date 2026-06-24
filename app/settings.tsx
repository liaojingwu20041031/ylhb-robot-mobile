import { useState } from 'react';
import { StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { MockScenario } from '../src/api/types';
import { AppButton } from '../src/components/AppButton';
import { HelpText } from '../src/components/HelpText';
import { PageContainer } from '../src/components/PageContainer';
import { SectionCard } from '../src/components/SectionCard';
import { StatusCard } from '../src/components/StatusCard';
import { colors } from '../src/theme/consoleTheme';
import { robotActions, useRobotStore } from '../src/store/robotStore';

const scenarios: Array<{ key: MockScenario; label: string }> = [
  { key: 'normal', label: '正常运行' },
  { key: 'scan_fault', label: '雷达故障' },
  { key: 'chassis_fault', label: '底盘故障' },
  { key: 'mapping', label: '建图中' },
  { key: 'no_map', label: '无地图/等待地图' },
];

export default function SettingsPage() {
  const snapshot = useRobotStore((value) => value);
  const [baseUrl, setBaseUrl] = useState(snapshot.baseUrl);
  const [mockMode, setMockMode] = useState(snapshot.mockMode);
  const [websocketEnabled, setWebsocketEnabled] = useState(snapshot.websocketEnabled);
  const [refreshInterval, setRefreshInterval] = useState(String(snapshot.refreshIntervalMs));

  return (
    <PageContainer title="连接设置" subtitle="配置 Jetson bridge、运行模式、WebSocket 和状态刷新间隔。">
      <SectionCard title="Jetson Bridge 设置" description="表单只影响手机端请求地址，不修改机器人后端逻辑。">
        <View style={styles.inputBox}>
          <Text style={styles.label}>Jetson 地址</Text>
          <TextInput
            style={styles.input}
            value={baseUrl}
            onChangeText={setBaseUrl}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="http://192.168.1.100:8000"
            placeholderTextColor={colors.textSubtle}
          />
        </View>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>Mock Mode / Real Robot Mode</Text>
            <Text style={styles.hint}>{mockMode ? '当前准备保存为 Mock Mode' : '当前准备保存为 Real Robot Mode'}</Text>
          </View>
          <Switch value={mockMode} onValueChange={setMockMode} />
        </View>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>WebSocket 开关</Text>
            <Text style={styles.hint}>开启后尝试从 /ws/status 接收状态；地图预览仍使用 HTTP 手动刷新。</Text>
          </View>
          <Switch value={websocketEnabled} onValueChange={setWebsocketEnabled} />
        </View>
        <View style={styles.inputBox}>
          <Text style={styles.label}>状态刷新间隔（ms）</Text>
          <TextInput style={styles.input} value={refreshInterval} onChangeText={setRefreshInterval} keyboardType="numeric" placeholderTextColor={colors.textSubtle} />
        </View>
        {!mockMode ? (
          <HelpText tone="danger">真机模式会直接向机器人发送控制命令。请确认机器人周围安全，首次测试请架空轮子。</HelpText>
        ) : null}
        <HelpText tone="info">当前后端默认 require_token=false，APP 暂不提供 token 设置；后续启用鉴权时可扩展。</HelpText>
        <View style={styles.actions}>
          <AppButton label="保存设置" onPress={() => robotActions.saveSettings(baseUrl, mockMode, websocketEnabled, Number(refreshInterval) || 1000)} style={styles.action} />
          <AppButton label="测试 HTTP 连接" variant="secondary" loading={snapshot.pending.status} onPress={() => robotActions.testHttpConnection()} style={styles.action} />
          <AppButton label="测试 WebSocket" variant="secondary" onPress={() => robotActions.testWebSocket()} style={styles.action} />
          <AppButton
            label="恢复默认配置"
            variant="ghost"
            onPress={() => {
              robotActions.restoreDefaults();
              setBaseUrl('http://192.168.1.100:8000');
              setMockMode(true);
              setWebsocketEnabled(false);
              setRefreshInterval('1000');
            }}
            style={styles.action}
          />
        </View>
      </SectionCard>
      <SectionCard title="Mock Mode 演示场景" description="用于完整演示验收流程，不需要真实机器人。">
        <View style={styles.actions}>
          {scenarios.map((scenario) => (
            <AppButton
              key={scenario.key}
              label={scenario.label}
              variant={snapshot.mockScenario === scenario.key ? 'primary' : 'ghost'}
              onPress={() => robotActions.setMockScenario(scenario.key)}
              style={styles.scenario}
            />
          ))}
        </View>
      </SectionCard>
      <SectionCard title="测试结果" description="显示 HTTP 延迟、/api/status 与 WebSocket 测试结果。">
        <View style={styles.grid}>
          <StatusCard title="当前 URL" value={snapshot.baseUrl} />
          <StatusCard title="当前模式" value={snapshot.mockMode ? 'Mock Mode' : 'Real Robot Mode'} tone={snapshot.mockMode ? 'warning' : 'danger'} />
          <StatusCard title="WebSocket" value={snapshot.websocketEnabled ? '启用' : '关闭'} />
          <StatusCard title="状态刷新间隔" value={`${snapshot.refreshIntervalMs} ms`} />
          <StatusCard title="HTTP 延迟" value={snapshot.httpTest?.latencyMs !== undefined ? `${snapshot.httpTest.latencyMs} ms` : undefined} />
          <StatusCard title="/api/status" value={snapshot.httpTest?.message} />
          <StatusCard title="WebSocket 是否连接" value={snapshot.websocketTest?.message} />
        </View>
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
  hint: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: colors.input,
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 10,
    borderRadius: 8,
    borderColor: colors.border,
    borderWidth: 1,
    backgroundColor: colors.bgElevated,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
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
  scenario: {
    flex: 1,
    minWidth: 112,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
});
