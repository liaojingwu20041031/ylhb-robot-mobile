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
        <Stack.Screen name="index" options={{ title: '智慧零售机器人' }} />
        <Stack.Screen name="dashboard" options={{ title: '状态监控' }} />
        <Stack.Screen name="control" options={{ title: '底盘控制' }} />
        <Stack.Screen name="tasks" options={{ title: '零售任务' }} />
        <Stack.Screen name="debug" options={{ title: '调试中心' }} />
        <Stack.Screen name="logs" options={{ title: '系统日志' }} />
        <Stack.Screen name="settings" options={{ title: '连接设置' }} />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}
