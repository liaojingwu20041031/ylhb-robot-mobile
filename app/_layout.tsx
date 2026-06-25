import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../src/theme/consoleTheme';

export default function Layout() {
  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bgElevated },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '900' },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ title: '智能机器人调试' }} />
        <Stack.Screen name="status" options={{ title: '状态检查' }} />
        <Stack.Screen name="control" options={{ title: '底盘调试' }} />
        <Stack.Screen name="mapping" options={{ title: '建图调试' }} />
        <Stack.Screen name="maps" options={{ title: '地图管理' }} />
        <Stack.Screen name="debug" options={{ title: '调试入口' }} />
        <Stack.Screen name="logs" options={{ title: '系统日志' }} />
        <Stack.Screen name="settings" options={{ title: '连接设置' }} />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}
