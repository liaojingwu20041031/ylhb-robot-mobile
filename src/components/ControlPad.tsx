import { useEffect, useMemo, useRef, useState } from 'react';
import { GestureResponderEvent, PanResponder, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors } from '../theme/consoleTheme';
import { freshnessTone, nodeOk, topicOk } from '../utils/status';
import { robotActions, useRobotStore } from '../store/robotStore';
import { AppButton } from './AppButton';
import { HelpText } from './HelpText';

const REPEAT_MS = 250;
const LINEAR_MIN = 0.01;
const LINEAR_MAX = 0.35;
const ANGULAR_MIN = 0.05;
const ANGULAR_MAX = 0.55;

type Props = {
  mode?: 'standalone' | 'mapping';
  compact?: boolean;
};

export function ControlPad({ mode = 'standalone', compact = false }: Props) {
  const { status, debugStatus, pending, endpointSwitching } = useRobotStore((snapshot) => ({
    status: snapshot.status,
    debugStatus: snapshot.debugStatus,
    pending: snapshot.pending,
    endpointSwitching: snapshot.endpointSwitching,
  }));
  const { linearSpeed, angularSpeed, commandDurationMs } = useRobotStore((snapshot) => ({
    linearSpeed: snapshot.linearSpeed,
    angularSpeed: snapshot.angularSpeed,
    commandDurationMs: snapshot.commandDurationMs,
  }));
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeDirectionRef = useRef<string | null>(null);

  const bridgeReady = status.online && status.connectionState === 'connected';
  const cmdVelReady = topicOk(debugStatus, '/cmd_vel');
  const odomAge = debugStatus?.lastOdomAgeSec ?? status.lastOdomAgeSec;
  const scanAge = debugStatus?.lastScanAgeSec ?? status.lastScanAgeSec;
  const imuAge = debugStatus?.lastImuAgeSec;
  const odomFresh = topicOk(debugStatus, '/odom') && freshnessTone(odomAge) !== 'danger';
  const scanFresh = topicOk(debugStatus, '/scan') && freshnessTone(scanAge) !== 'danger';
  const tfFresh = nodeOk(debugStatus, 'tf');
  const imuMissing = !topicOk(debugStatus, '/imu/data') || freshnessTone(imuAge) === 'stale' || freshnessTone(imuAge) === 'danger';
  const mappingReady = odomFresh && scanFresh && tfFresh;
  const movementReady = bridgeReady && cmdVelReady && (mode === 'mapping' ? mappingReady : true);
  const movementDisabled = !movementReady || endpointSwitching;
  const speed = Math.min(linearSpeed, LINEAR_MAX);
  const turn = Math.min(angularSpeed, ANGULAR_MAX);

  const clearHold = () => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    activeDirectionRef.current = null;
  };

  useEffect(() => () => stopHold(true), []);

  useEffect(() => {
    if (movementDisabled) {
      if (endpointSwitching) {
        clearHold();
      } else {
        stopHold();
      }
    }
  }, [endpointSwitching, movementDisabled]);

  const guidance = useMemo(() => {
    if (endpointSwitching) return '连接正在切换，运动控制暂不可用。';
    if (!bridgeReady) return '机器人未连接，方向按钮已禁用。';
    if (!cmdVelReady) return '运动通道不可用，方向按钮已禁用。';
    if (mode === 'mapping' && !mappingReady) return '里程计、激光雷达或坐标变换未就绪，建图点动已禁用。';
    if (!odomFresh) return '里程计数据过期，地面移动前请先检查。';
    if (!scanFresh || !tfFresh) return '可进行低速控制；开始建图前请检查传感器状态。';
    return '按住方向键持续移动，松手立即停止。';
  }, [bridgeReady, cmdVelReady, commandDurationMs, endpointSwitching, mappingReady, mode, odomFresh, scanFresh, tfFresh]);

  const stopHold = (quiet = false) => {
    const hadDirection = Boolean(activeDirectionRef.current);
    clearHold();
    if (hadDirection || quiet) {
      robotActions.emergencyStop(true);
      if (!quiet) {
        robotActions.addLog('user', '方向键已松开，已调用 /api/stop', undefined, '底盘控制');
      }
    }
  };

  const startHold = (label: string, linear: number, angular: number) => {
    if (movementDisabled) {
      return;
    }
    stopHold(true);
    activeDirectionRef.current = label;
    robotActions.addLog('user', `${label}开始：linear_x=${linear.toFixed(2)}, angular_z=${angular.toFixed(2)}`, undefined, '底盘控制');
    const send = () => {
      robotActions.sendVelocity({ linear_x: linear, angular_z: angular, duration_ms: commandDurationMs }, true);
    };
    send();
    holdTimerRef.current = setInterval(send, REPEAT_MS);
  };

  return (
    <View style={styles.panel}>
      {!compact ? <HelpText tone="warning">
        {mode === 'mapping'
          ? '建图辅助控制使用更保守速度，适合一边低速移动一边观察地图增长。'
          : '底盘点动会向真实机器人发送速度命令。首次测试请架空轮子。'}
      </HelpText> : null}
      {imuMissing && !compact ? <HelpText tone="warning">姿态传感器数据缺失或过期，仅作风险提示，不会锁定点动。</HelpText> : null}
      {!compact ? <HelpText tone={movementDisabled ? 'warning' : 'success'}>{guidance}</HelpText> : null}
      <View style={[styles.speedBox, compact && styles.speedBoxCompact]}>
        <Text style={styles.speedTitle}>速度调节</Text>
        <SpeedSlider label="直行速度" value={linearSpeed} unit="m/s" min={LINEAR_MIN} max={LINEAR_MAX} step={0.01} dense={compact} onChange={robotActions.setLinearSpeed} />
        <SpeedSlider label="转向速度" value={angularSpeed} unit="rad/s" min={ANGULAR_MIN} max={ANGULAR_MAX} step={0.01} dense={compact} onChange={robotActions.setAngularSpeed} />
      </View>
      <View style={styles.grid}>
        <HoldButton label="前进" disabled={movementDisabled} disabledReason={guidance} onPressIn={() => startHold('前进', speed, 0)} onPressOut={() => stopHold()} style={[styles.full, compact && styles.compactHold]} />
        <HoldButton label="左转" disabled={movementDisabled} disabledReason={guidance} onPressIn={() => startHold('左转', 0, turn)} onPressOut={() => stopHold()} style={[styles.third, compact && styles.compactHold]} />
        <AppButton label="停止" variant="secondary" disabled={endpointSwitching} loading={pending.controlPending} onPress={() => robotActions.chassisStop()} style={styles.third} accessibilityHint="发送零速度停止命令" />
        <HoldButton label="右转" disabled={movementDisabled} disabledReason={guidance} onPressIn={() => startHold('右转', 0, -turn)} onPressOut={() => stopHold()} style={[styles.third, compact && styles.compactHold]} />
        <HoldButton label="后退" disabled={movementDisabled} disabledReason={guidance} onPressIn={() => startHold('后退', -speed, 0)} onPressOut={() => stopHold()} style={[styles.full, compact && styles.compactHold]} />
        <AppButton label="紧急停止" variant="danger" loading={pending.controlPending} onPress={() => robotActions.emergencyStopAllEndpoints()} style={styles.full} accessibilityLabel="紧急停止机器人" accessibilityHint="向所有已知机器人地址发送停止请求" />
      </View>
    </View>
  );
}

function SpeedSlider({
  label,
  value,
  unit,
  step,
  min,
  max,
  dense = false,
  onChange,
}: {
  label: string;
  value: number;
  unit: string;
  step: number;
  min: number;
  max: number;
  dense?: boolean;
  onChange: (value: number) => void;
}) {
  const [trackWidth, setTrackWidth] = useState(1);
  const percent = (value - min) / (max - min);
  const commitFromEvent = (event: GestureResponderEvent) => {
    const x = Math.max(0, Math.min(trackWidth, event.nativeEvent.locationX));
    const raw = min + (x / trackWidth) * (max - min);
    const stepped = Math.round(raw / step) * step;
    onChange(stepped);
  };
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: commitFromEvent,
        onPanResponderMove: commitFromEvent,
      }),
    [trackWidth, min, max, step, onChange],
  );

  return (
    <View style={styles.sliderBox}>
      <View style={styles.sliderHeader}>
        <Text style={styles.sliderLabel}>{label}</Text>
        <Text style={styles.sliderValue}>{value.toFixed(2)} {unit}</Text>
      </View>
      <View
        style={styles.sliderTrack}
        onLayout={(event) => setTrackWidth(Math.max(1, event.nativeEvent.layout.width))}
        {...panResponder.panHandlers}
      >
        <View style={[styles.sliderFill, { width: `${Math.max(0, Math.min(1, percent)) * 100}%` }]} />
        <View style={[styles.sliderThumb, { left: `${Math.max(0, Math.min(1, percent)) * 100}%` }]} />
      </View>
      {!dense ? <View style={styles.sliderFooter}>
        <Text style={styles.sliderRange}>{min.toFixed(2)} {unit}</Text>
        <Text style={styles.sliderRange}>{max.toFixed(2)} {unit}</Text>
      </View> : null}
    </View>
  );
}

function HoldButton({
  label,
  disabledReason,
  disabled,
  onPressIn,
  onPressOut,
  style,
}: {
  label: string;
  disabledReason: string;
  disabled: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
  style: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={disabled ? disabledReason : `按住${label}，松手停止`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      hitSlop={6}
      android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
      style={({ pressed }) => [styles.holdButton, disabled && styles.holdDisabled, pressed && styles.holdPressed, style]}
    >
      <Text style={styles.holdLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  speedBox: {
    gap: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: colors.bgElevated,
    borderColor: colors.border,
    borderWidth: 1,
  },
  speedBoxCompact: {
    padding: 10,
    gap: 6,
  },
  speedTitle: {
    color: colors.text,
    fontWeight: '700',
  },
  sliderBox: {
    gap: 6,
  },
  sliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sliderLabel: {
    color: colors.textMuted,
    fontWeight: '800',
  },
  sliderValue: {
    color: colors.text,
    fontWeight: '900',
  },
  sliderTrack: {
    height: 32,
    justifyContent: 'center',
    backgroundColor: colors.panelSoft,
    borderRadius: 16,
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  sliderThumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    marginLeft: -11,
    borderRadius: 11,
    backgroundColor: colors.panel,
    borderColor: colors.primary,
    borderWidth: 3,
  },
  sliderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderRange: {
    color: colors.textSubtle,
    fontSize: 11,
  },
  holdButton: {
    minHeight: 64,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 5,
  },
  compactHold: {
    minHeight: 52,
    padding: 8,
  },
  holdPressed: {
    backgroundColor: colors.warning,
  },
  holdDisabled: {
    opacity: 0.45,
  },
  holdLabel: {
    color: colors.panel,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  full: {
    width: '100%',
  },
  third: {
    flex: 1,
    minWidth: 96,
  },
  half: {
    flex: 1,
    minWidth: 132,
  },
});
