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
        <Stack.Screen name="index" options={{ title: '电力巡检机器人' }} />
        <Stack.Screen name="dashboard" options={{ title: '系统状态' }} />
        <Stack.Screen name="control" options={{ title: '底盘调试' }} />
        <Stack.Screen name="debug" options={{ title: 'APP 调试端' }} />
        <Stack.Screen name="logs" options={{ title: '系统日志' }} />
        <Stack.Screen name="settings" options={{ title: '连接设置' }} />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}
