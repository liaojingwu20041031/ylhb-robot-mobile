import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { AppButton } from '../src/components/AppButton';
import { HelpText } from '../src/components/HelpText';
import { PageContainer } from '../src/components/PageContainer';
import { SectionCard } from '../src/components/SectionCard';
import { StatusCard } from '../src/components/StatusCard';
import { colors } from '../src/theme/consoleTheme';
import { robotActions, useRobotStore } from '../src/store/robotStore';

export default function SettingsPage() {
  const snapshot = useRobotStore((value) => value);
  const [baseUrl, setBaseUrl] = useState(snapshot.baseUrl);
  const [refreshInterval, setRefreshInterval] = useState(String(snapshot.refreshIntervalMs));

  useEffect(() => {
    setBaseUrl(snapshot.baseUrl);
    setRefreshInterval(String(snapshot.refreshIntervalMs));
  }, [snapshot.baseUrl, snapshot.refreshIntervalMs]);

  const interval = Number(refreshInterval) || 1000;

  return (
    <PageContainer title="连接设置" subtitle="只配置真实 Jetson ylhb_mobile_bridge。">
      <SectionCard title="Jetson Bridge 设置" description="保存后会立即尝试连接机器人。">
        <View style={styles.inputBox}>
          <Text style={styles.label}>Jetson Base URL</Text>
          <TextInput
            style={styles.input}
            value={baseUrl}
            onChangeText={setBaseUrl}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="http://192.168.137.100:8000"
            placeholderTextColor={colors.textSubtle}
          />
        </View>
        <View style={styles.inputBox}>
          <Text style={styles.label}>状态刷新间隔（ms）</Text>
          <TextInput
            style={styles.input}
            value={refreshInterval}
            onChangeText={setRefreshInterval}
            keyboardType="numeric"
            placeholder="1000"
            placeholderTextColor={colors.textSubtle}
          />
        </View>
        <HelpText tone="danger">此 APP 只面向真实机器人。底盘控制会直接发送 /cmd_vel、零速度停止和急停请求。</HelpText>
        <HelpText tone="info">后端默认 require_token=false，本轮不配置 token。</HelpText>
        <View style={styles.actions}>
          <AppButton label="保存并连接" loading={snapshot.pending.connectPending} onPress={() => robotActions.saveSettingsAndConnect(baseUrl, interval)} style={styles.action} />
          <AppButton label="测试 HTTP 连接" variant="secondary" loading={snapshot.pending.statusPending} onPress={() => robotActions.testHttpConnection()} style={styles.action} />
          <AppButton label="测试 WebSocket" variant="secondary" onPress={() => robotActions.testWebSocket()} style={styles.action} />
          <AppButton
            label="恢复默认"
            variant="ghost"
            onPress={() => robotActions.restoreDefaults()}
            style={styles.action}
          />
        </View>
      </SectionCard>
      <SectionCard title="当前配置" description="连接结果和状态来源。">
        <View style={styles.grid}>
          <StatusCard title="当前 URL" value={snapshot.baseUrl} />
          <StatusCard title="状态来源" value={snapshot.statusSource} />
          <StatusCard title="刷新间隔" value={`${snapshot.refreshIntervalMs} ms`} />
          <StatusCard title="HTTP 延迟" value={snapshot.httpTest?.latencyMs !== undefined ? `${snapshot.httpTest.latencyMs} ms` : undefined} />
          <StatusCard title="/api/status" value={snapshot.httpTest?.message} />
          <StatusCard title="/ws/status" value={snapshot.websocketTest?.message} />
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
    flexWrap: 'wrap',
    gap: 10,
  },
});
