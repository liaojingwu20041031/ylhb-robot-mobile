import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { colors } from '@/theme/consoleTheme';

const icons = { index: 'home-outline', control: 'game-controller-outline', mapping: 'map-outline', maps: 'layers-outline', more: 'menu-outline' } as const;

export default function TabsLayout() {
  return (
    <Tabs screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textMuted,
      tabBarStyle: { minHeight: 64, paddingTop: 6, paddingBottom: 8, backgroundColor: colors.panel, borderTopColor: colors.border },
      tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name as keyof typeof icons]} size={Math.max(22, size)} color={color} />,
    })}>
      <Tabs.Screen name="index" options={{ title: '首页' }} />
      <Tabs.Screen name="control" options={{ title: '控制' }} />
      <Tabs.Screen name="mapping" options={{ title: '建图' }} />
      <Tabs.Screen name="maps" options={{ title: '地图' }} />
      <Tabs.Screen name="more" options={{ title: '更多' }} />
    </Tabs>
  );
}
