import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { robotActions, useRobotStore } from '../../store/robotStore';
import { colors } from '../../theme/consoleTheme';
import { stateTone } from '../../utils/status';
import { AppButton } from '../AppButton';
import { HelpText } from '../HelpText';
import { SectionCard } from '../SectionCard';
import { StatusCard } from '../StatusCard';

const PRESETS = [
  { label: '起点区', x: 0, y: 0, yaw: 0 },
  { label: '货架区', x: 1.2, y: 0.5, yaw: 0 },
  { label: '结算区', x: 0.5, y: -0.8, yaw: 1.57 },
  { label: '测试点 1', x: 0.8, y: 0.2, yaw: 0 },
  { label: '测试点 2', x: -0.4, y: 0.9, yaw: 3.14 },
];

export function NavigationTestPanel() {
  const { debugStatus, pending } = useRobotStore((snapshot) => ({
    debugStatus: snapshot.debugStatus,
    pending: snapshot.pending,
  }));
  const [label, setLabel] = useState('手动目标');
  const [x, setX] = useState('1.0');
  const [y, setY] = useState('0.5');
  const [yaw, setYaw] = useState('0.0');
  const topics = debugStatus?.topics ?? {};
  const nodes = debugStatus?.nodes ?? {};

  const body = (name = label) => ({
    x: Number(x) || 0,
    y: Number(y) || 0,
    yaw: Number(yaw) || 0,
    label: name,
  });

  return (
    <SectionCard title="导航测试" description="导航依赖地图、AMCL、Nav2、/scan、/odom 和初始位姿。">
      <HelpText tone="warning">风险提示：发送目标点可能导致机器人移动。请确认地图、定位和周边环境安全。</HelpText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <StatusCard title="my_map.yaml" value={topics['/map']} tone={stateTone(topics['/map'])} />
        <StatusCard title="/map" value={topics['/map']} tone={stateTone(topics['/map'])} />
        <StatusCard title="/scan" value={topics['/scan']} tone={stateTone(topics['/scan'])} />
        <StatusCard title="/odom" value={topics['/odom']} tone={stateTone(topics['/odom'])} />
        <StatusCard title="AMCL" value={nodes.amcl} tone={stateTone(nodes.amcl)} />
        <StatusCard title="planner_server" value={nodes.planner_server} tone={stateTone(nodes.planner_server)} />
        <StatusCard title="controller_server" value={nodes.controller_server} tone={stateTone(nodes.controller_server)} />
        <StatusCard title="bt_navigator" value={nodes.bt_navigator} tone={stateTone(nodes.bt_navigator)} />
        <StatusCard title="initial pose" value={nodes.amcl ? '需现场确认' : undefined} tone={nodes.amcl ? 'warning' : 'neutral'} />
      </View>
      <View style={styles.inputGrid}>
        <Input label="目标名称" value={label} onChangeText={setLabel} />
        <Input label="x" value={x} onChangeText={setX} numeric />
        <Input label="y" value={y} onChangeText={setY} numeric />
        <Input label="yaw" value={yaw} onChangeText={setYaw} numeric />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {PRESETS.map((preset) => (
          <AppButton
            key={preset.label}
            label={preset.label}
            variant="secondary"
            onPress={() => {
              setLabel(preset.label);
              setX(String(preset.x));
              setY(String(preset.y));
              setYaw(String(preset.yaw));
            }}
            style={{ flex: 1, minWidth: 112 }}
          />
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <AppButton label="启动导航" variant="warning" loading={pending.navigation} onPress={() => robotActions.startNavigation()} style={{ flex: 1, minWidth: 140 }} />
        <AppButton label="设置初始位姿" variant="warning" loading={pending.navigation} onPress={() => robotActions.setInitialPose(body())} style={{ flex: 1, minWidth: 140 }} />
        <AppButton label="发送目标点" variant="warning" loading={pending.navigation} onPress={() => robotActions.sendNavigationGoal(body())} style={{ flex: 1, minWidth: 140 }} />
        <AppButton label="取消导航" variant="danger" loading={pending.navigation} onPress={() => robotActions.cancelNavigation()} style={{ flex: 1, minWidth: 140 }} />
      </View>
    </SectionCard>
  );
}

function Input({
  label,
  value,
  onChangeText,
  numeric,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  numeric?: boolean;
}) {
  return (
    <View style={styles.inputBox}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={numeric ? 'numeric' : 'default'}
        placeholderTextColor={colors.textSubtle}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  inputGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  inputBox: {
    flex: 1,
    minWidth: 130,
    gap: 4,
  },
  inputLabel: {
    color: colors.textMuted,
    fontWeight: '800',
    fontSize: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
    backgroundColor: colors.input,
    color: colors.text,
  },
});
