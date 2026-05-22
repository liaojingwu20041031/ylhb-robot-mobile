import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { robotActions } from '../../store/robotStore';

const PRESETS = [
  { label: '起点区', x: 0, y: 0, yaw: 0 },
  { label: '货架区', x: 1.2, y: 0.5, yaw: 0 },
  { label: '结算区', x: 0.5, y: -0.8, yaw: 1.57 },
];

export function NavigationTestPanel() {
  const [x, setX] = useState('1.0');
  const [y, setY] = useState('0.5');
  const [yaw, setYaw] = useState('0.0');

  const goal = (label?: string) =>
    robotActions.sendNavigationGoal({
      x: Number(x) || 0,
      y: Number(y) || 0,
      yaw: Number(yaw) || 0,
      label,
    });

  return (
    <View style={styles.card}>
      <Text style={styles.title}>导航测试</Text>
      <Text style={styles.notice}>导航前请确认地图、定位和机器人周围安全。</Text>
      <View style={styles.row}>
        <Button label="检查依赖" onPress={() => robotActions.navigationStatus()} />
        <Button label="启动导航" onPress={() => robotActions.startNavigation()} />
      </View>
      <View style={styles.inputRow}>
        <Input label="x" value={x} onChangeText={setX} />
        <Input label="y" value={y} onChangeText={setY} />
        <Input label="yaw" value={yaw} onChangeText={setYaw} />
      </View>
      <View style={styles.row}>
        <Button
          label="设置初始位姿"
          onPress={() =>
            robotActions.setInitialPose({
              x: Number(x) || 0,
              y: Number(y) || 0,
              yaw: Number(yaw) || 0,
            })
          }
        />
        <Button label="发送目标点" onPress={() => goal('manual_goal')} />
      </View>
      <View style={styles.row}>
        {PRESETS.map((preset) => (
          <Button
            key={preset.label}
            label={preset.label}
            onPress={() => {
              setX(String(preset.x));
              setY(String(preset.y));
              setYaw(String(preset.yaw));
              robotActions.sendNavigationGoal(preset);
            }}
          />
        ))}
      </View>
      <Button label="取消导航" onPress={() => robotActions.cancelNavigation()} neutral />
    </View>
  );
}

function Input({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.inputBox}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType="numeric"
      />
    </View>
  );
}

function Button({ label, onPress, neutral }: { label: string; onPress: () => void; neutral?: boolean }) {
  return (
    <TouchableOpacity style={[styles.button, neutral && styles.neutral]} onPress={onPress}>
      <Text style={styles.buttonText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d0d7de',
    backgroundColor: '#fff',
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  notice: {
    color: '#9a6700',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  inputBox: {
    flex: 1,
  },
  inputLabel: {
    color: '#667085',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d0d7de',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#fff',
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#0969da',
  },
  neutral: {
    backgroundColor: '#57606a',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '800',
    textAlign: 'center',
  },
});
