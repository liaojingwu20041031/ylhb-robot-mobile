import { useState } from 'react';
import { StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { PageContainer } from '../src/components/PageContainer';
import { StatusCard } from '../src/components/StatusCard';
import { robotActions, useRobotStore } from '../src/store/robotStore';

export default function SettingsPage() {
  const snapshot = useRobotStore((value) => value);
  const [baseUrl, setBaseUrl] = useState(snapshot.baseUrl);
  const [mockMode, setMockMode] = useState(snapshot.mockMode);
  const [websocketEnabled, setWebsocketEnabled] = useState(snapshot.websocketEnabled);

  return (
    <PageContainer title="设置" subtitle="配置 Jetson bridge 和运行模式">
      <View style={styles.card}>
        <Text style={styles.label}>Jetson Base URL</Text>
        <TextInput
          style={styles.input}
          value={baseUrl}
          onChangeText={setBaseUrl}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="http://192.168.1.100:8000"
        />
        <View style={styles.row}>
          <Text style={styles.label}>Mock Mode</Text>
          <Switch value={mockMode} onValueChange={setMockMode} />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>WebSocket 自动更新</Text>
          <Switch value={websocketEnabled} onValueChange={setWebsocketEnabled} />
        </View>
        <TouchableOpacity
          style={styles.button}
          onPress={() => robotActions.saveSettings(baseUrl, mockMode, websocketEnabled)}
        >
          <Text style={styles.buttonText}>保存设置</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondary} onPress={() => robotActions.refreshStatus()}>
          <Text style={styles.secondaryText}>测试连接</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.grid}>
        <StatusCard title="当前 URL" value={snapshot.baseUrl} />
        <StatusCard title="当前模式" value={snapshot.mockMode ? 'Mock' : 'Real Robot'} />
        <StatusCard title="WebSocket" value={snapshot.websocketEnabled ? '启用' : '关闭'} />
        <StatusCard title="连接状态" value={snapshot.status.connectionState} />
      </View>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d0d7de',
    backgroundColor: '#fff',
    gap: 12,
  },
  label: {
    fontWeight: '700',
    color: '#17202a',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d0d7de',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  button: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#1f6feb',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '800',
  },
  secondary: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#57606a',
  },
  secondaryText: {
    color: '#fff',
    fontWeight: '800',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
});
