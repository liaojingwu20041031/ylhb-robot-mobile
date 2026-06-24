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
  const { status, debugStatus, pending } = useRobotStore((snapshot) => ({
    status: snapshot.status,
    debugStatus: snapshot.debugStatus,
    pending: snapshot.pending,
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
  const movementDisabled = !movementReady;
  const speed = Math.min(linearSpeed, LINEAR_MAX);
  const turn = Math.min(angularSpeed, ANGULAR_MAX);

  useEffect(() => () => stopHold(true), []);

  useEffect(() => {
    if (movementDisabled) {
      stopHold();
    }
  }, [movementDisabled]);

  const guidance = useMemo(() => {
    if (!bridgeReady) return 'Bridge 未连接，运动按钮已禁用。';
    if (!cmdVelReady) return '/cmd_vel 不存在，不能发送速度命令。';
    if (mode === 'mapping' && !mappingReady) return '建图辅助移动需要 /odom、/scan 与 TF 可用且新鲜。';
    if (!odomFresh) return '架空测试可用；地面低速前请确认 /odom 新鲜。';
    if (!scanFresh || !tfFresh) return '地面低速可用；建图前请确认 /scan 与 TF。';
    return `按住方向键会连续发送 ${commandDurationMs}ms 短时速度命令，松手立即调用 /api/stop。`;
  }, [bridgeReady, cmdVelReady, commandDurationMs, mappingReady, mode, odomFresh, scanFresh, tfFresh]);

  const stopHold = (quiet = false) => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    const hadDirection = Boolean(activeDirectionRef.current);
    activeDirectionRef.current = null;
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
      {imuMissing && !compact ? <HelpText tone="warning">/imu/data 缺失或过期：仅提示风险，不硬锁点动。</HelpText> : null}
      <HelpText tone={movementDisabled ? 'warning' : 'success'}>{guidance}</HelpText>
      <View style={[styles.speedBox, compact && styles.speedBoxCompact]}>
        <Text style={styles.speedTitle}>速度调节</Text>
        <SpeedSlider label="线速度" value={linearSpeed} unit="m/s" min={LINEAR_MIN} max={LINEAR_MAX} step={0.01} dense={compact} onChange={robotActions.setLinearSpeed} />
        <SpeedSlider label="角速度" value={angularSpeed} unit="rad/s" min={ANGULAR_MIN} max={ANGULAR_MAX} step={0.01} dense={compact} onChange={robotActions.setAngularSpeed} />
        {mode === 'mapping' && !compact ? <HelpText tone="warning">前端上限与后端硬上限保持一致：线速度 0.35 m/s，角速度 0.55 rad/s。</HelpText> : null}
      </View>
      <View style={styles.grid}>
        <HoldButton label="前进" description={`${speed.toFixed(2)} m/s，续发 ${commandDurationMs}ms`} disabled={movementDisabled} onPressIn={() => startHold('前进', speed, 0)} onPressOut={() => stopHold()} style={[styles.full, compact && styles.compactHold]} />
        <HoldButton label="左转" description={`${turn.toFixed(2)} rad/s，续发 ${commandDurationMs}ms`} disabled={movementDisabled} onPressIn={() => startHold('左转', 0, turn)} onPressOut={() => stopHold()} style={[styles.third, compact && styles.compactHold]} />
        <AppButton label="零速度停止" description="POST /api/debug/chassis/stop" variant="secondary" loading={pending.controlPending} onPress={() => robotActions.chassisStop()} style={styles.third} />
        <HoldButton label="右转" description={`${(-turn).toFixed(2)} rad/s，续发 ${commandDurationMs}ms`} disabled={movementDisabled} onPressIn={() => startHold('右转', 0, -turn)} onPressOut={() => stopHold()} style={[styles.third, compact && styles.compactHold]} />
        <HoldButton label="后退" description={`${(-speed).toFixed(2)} m/s，续发 ${commandDurationMs}ms`} disabled={movementDisabled} onPressIn={() => startHold('后退', -speed, 0)} onPressOut={() => stopHold()} style={[compact ? styles.half : styles.full, compact && styles.compactHold]} />
        <AppButton label="急停" description="全局 emergency stop" variant="danger" loading={pending.controlPending} onPress={() => robotActions.emergencyStop()} style={compact ? styles.half : styles.full} />
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
  description,
  disabled,
  onPressIn,
  onPressOut,
  style,
}: {
  label: string;
  description: string;
  disabled: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
  style: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={({ pressed }) => [styles.holdButton, disabled && styles.holdDisabled, pressed && styles.holdPressed, style]}
    >
      <Text style={styles.holdLabel}>{label}</Text>
      <Text style={styles.holdDescription}>{description}</Text>
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
    borderRadius: 8,
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
    fontWeight: '900',
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
    minHeight: 72,
    borderRadius: 8,
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
  holdDescription: {
    color: colors.primarySoft,
    fontSize: 11,
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
