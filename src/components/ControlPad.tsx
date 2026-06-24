import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/consoleTheme';
import { freshnessTone, nodeOk, topicOk } from '../utils/status';
import { robotActions, useRobotStore } from '../store/robotStore';
import { AppButton } from './AppButton';
import { HelpText } from './HelpText';

const REPEAT_MS = 250;
const LOCK_TIMEOUT_MS = 10000;

type Props = {
  mode?: 'standalone' | 'mapping';
};

export function ControlPad({ mode = 'standalone' }: Props) {
  const { status, debugStatus, pending } = useRobotStore((snapshot) => ({
    status: snapshot.status,
    debugStatus: snapshot.debugStatus,
    pending: snapshot.pending,
  }));
  const { speedProfile, linearSpeed, angularSpeed, commandDurationMs } = useRobotStore((snapshot) => ({
    speedProfile: snapshot.speedProfile,
    linearSpeed: snapshot.linearSpeed,
    angularSpeed: snapshot.angularSpeed,
    commandDurationMs: snapshot.commandDurationMs,
  }));
  const [unlocked, setUnlocked] = useState(false);
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
  const movementReady = mode === 'mapping' ? mappingReady : bridgeReady && cmdVelReady;
  const movementDisabled = !unlocked || !bridgeReady || !cmdVelReady || !movementReady;
  const speed = mode === 'mapping' ? Math.min(linearSpeed, 0.06) : linearSpeed;
  const turn = mode === 'mapping' ? Math.min(angularSpeed, 0.18) : angularSpeed;

  useEffect(() => {
    if (!unlocked) {
      return undefined;
    }
    const timer = setTimeout(() => setUnlocked(false), LOCK_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [unlocked, pending.controlPending]);

  useEffect(() => () => stopHold(true), []);

  useEffect(() => {
    if (!unlocked || movementDisabled) {
      stopHold();
    }
  }, [movementDisabled, unlocked]);

  const guidance = useMemo(() => {
    if (!bridgeReady) return 'Bridge 未连接，运动按钮已禁用。';
    if (!cmdVelReady) return '/cmd_vel 不存在，不能发送速度命令。';
    if (mode === 'mapping' && !mappingReady) return '建图辅助移动建议等待 /odom、/scan、TF 新鲜后再解锁。';
    if (!odomFresh) return '架空测试可用；地面低速前请确认 /odom 新鲜。';
    if (!scanFresh || !tfFresh) return '地面低速可用；建图前请确认 /scan 与 TF。';
    if (!unlocked) return `控制锁已锁定，解锁后按住方向键连续发送 ${commandDurationMs}ms 短时速度命令。`;
    return '控制已解锁，10 秒无操作会自动上锁。';
  }, [bridgeReady, cmdVelReady, commandDurationMs, mappingReady, mode, odomFresh, scanFresh, tfFresh, unlocked]);

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

  const lockToggle = () => {
    setUnlocked((value) => {
      if (value) {
        stopHold();
      }
      return !value;
    });
  };

  return (
    <View style={styles.panel}>
      <HelpText tone="warning">
        {mode === 'mapping'
          ? '建图辅助控制使用更保守速度，适合一边低速移动一边观察地图增长。'
          : '底盘点动会向真实机器人发送速度命令。首次测试请架空轮子。'}
      </HelpText>
      {imuMissing ? <HelpText tone="warning">/imu/data 缺失或过期：仅提示风险，不硬锁点动。</HelpText> : null}
      <View style={styles.lockRow}>
        <Text style={styles.lockText}>{unlocked ? '控制锁：已解锁' : '控制锁：已锁定'}</Text>
        <AppButton
          label={unlocked ? '立即上锁' : '解锁控制'}
          variant={unlocked ? 'secondary' : 'warning'}
          onPress={lockToggle}
          style={styles.lockButton}
        />
      </View>
      <HelpText tone={movementDisabled ? 'warning' : 'success'}>{guidance}</HelpText>
      <View style={styles.speedBox}>
        <Text style={styles.speedTitle}>速度档位</Text>
        <View style={styles.profileRow}>
          {(['超低速', '低速', '调试较快'] as const).map((profile) => (
            <AppButton
              key={profile}
              label={profile}
              variant={speedProfile === profile ? 'primary' : 'secondary'}
              onPress={() => robotActions.setSpeedProfile(profile)}
              style={styles.profileButton}
            />
          ))}
        </View>
        <Stepper label="线速度上限" value={linearSpeed} unit="m/s" step={0.01} min={0.01} max={0.15} onChange={robotActions.setLinearSpeed} />
        <Stepper label="角速度上限" value={angularSpeed} unit="rad/s" step={0.01} min={0.05} max={0.5} onChange={robotActions.setAngularSpeed} />
        {mode === 'mapping' ? <HelpText tone="warning">建图模式默认建议低速；本控件会把实际命令限制在更保守范围内。</HelpText> : null}
      </View>
      <View style={styles.grid}>
        <HoldButton label="前进" description={`${speed.toFixed(2)} m/s，续发 ${commandDurationMs}ms`} disabled={movementDisabled} onPressIn={() => startHold('前进', speed, 0)} onPressOut={() => stopHold()} style={styles.full} />
        <HoldButton label="左转" description={`${turn.toFixed(2)} rad/s，续发 ${commandDurationMs}ms`} disabled={movementDisabled} onPressIn={() => startHold('左转', 0, turn)} onPressOut={() => stopHold()} style={styles.third} />
        <AppButton label="停止" description="底盘普通停止" variant="secondary" loading={pending.controlPending} onPress={() => robotActions.chassisStop()} style={styles.third} />
        <HoldButton label="右转" description={`${(-turn).toFixed(2)} rad/s，续发 ${commandDurationMs}ms`} disabled={movementDisabled} onPressIn={() => startHold('右转', 0, -turn)} onPressOut={() => stopHold()} style={styles.third} />
        <HoldButton label="后退" description={`${(-speed).toFixed(2)} m/s，续发 ${commandDurationMs}ms`} disabled={movementDisabled} onPressIn={() => startHold('后退', -speed, 0)} onPressOut={() => stopHold()} style={styles.full} />
        <AppButton label="急停" description="全局 emergency stop" variant="danger" loading={pending.controlPending} onPress={() => robotActions.emergencyStop()} style={styles.full} />
      </View>
    </View>
  );
}

function Stepper({
  label,
  value,
  unit,
  step,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  unit: string;
  step: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <View style={styles.stepper}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        <AppButton label="-" variant="secondary" onPress={() => onChange(value - step)} style={styles.stepperButton} />
        <Text style={styles.stepperValue}>{value.toFixed(2)} {unit}</Text>
        <AppButton label="+" variant="secondary" onPress={() => onChange(value + step)} style={styles.stepperButton} />
      </View>
      <Text style={styles.stepperRange}>{min.toFixed(2)}..{max.toFixed(2)} {unit}</Text>
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
  style: object;
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
  lockRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
  },
  lockText: {
    color: colors.text,
    fontWeight: '900',
  },
  lockButton: {
    minWidth: 112,
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
  speedTitle: {
    color: colors.text,
    fontWeight: '900',
  },
  profileRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  profileButton: {
    flex: 1,
    minWidth: 90,
  },
  stepper: {
    gap: 6,
  },
  stepperLabel: {
    color: colors.textMuted,
    fontWeight: '800',
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperButton: {
    width: 52,
  },
  stepperValue: {
    flex: 1,
    color: colors.text,
    fontWeight: '900',
    textAlign: 'center',
  },
  stepperRange: {
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
  holdPressed: {
    backgroundColor: colors.warning,
  },
  holdDisabled: {
    opacity: 0.45,
  },
  holdLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  holdDescription: {
    color: colors.textMuted,
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
});
