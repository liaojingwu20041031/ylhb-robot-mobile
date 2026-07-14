import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { robotActions } from '@/store/robotStore';
import { colors } from '@/theme/consoleTheme';

export default function Layout() {
  useEffect(() => { void robotActions.initializeConnection(); }, []);
  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.panel },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="status" options={{ title: '设备状态' }} />
        <Stack.Screen name="logs" options={{ title: '运行日志' }} />
        <Stack.Screen name="settings" options={{ title: '连接设置' }} />
        <Stack.Screen name="debug" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}
