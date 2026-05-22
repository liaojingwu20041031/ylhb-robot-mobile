import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function Layout() {
  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#17202a' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'YLHB Robot' }} />
        <Stack.Screen name="dashboard" options={{ title: '状态面板' }} />
        <Stack.Screen name="control" options={{ title: '手动控制' }} />
        <Stack.Screen name="tasks" options={{ title: '零售任务' }} />
        <Stack.Screen name="debug" options={{ title: '调试中心' }} />
        <Stack.Screen name="logs" options={{ title: '日志' }} />
        <Stack.Screen name="settings" options={{ title: '设置' }} />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}
