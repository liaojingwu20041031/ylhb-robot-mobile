import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/consoleTheme';
import { freshnessTone } from '../utils/status';
import { robotActions, useRobotStore } from '../store/robotStore';
import { AppButton } from './AppButton';
import { HelpText } from './HelpText';

const DURATION_MS = 300;
const THROTTLE_MS = 200;
const LOCK_TIMEOUT_MS = 10000;

function command(linear_x: number, angular_z: number) {
  return robotActions.sendVelocity({ linear_x, angular_z, duration_ms: DURATION_MS });
}

export function ControlPad() {
  const { status, debugStatus, pending } = useRobotStore((snapshot) => ({
    status: snapshot.status,
    debugStatus: snapshot.debugStatus,
    pending: snapshot.pending,
  }));
  const [unlocked, setUnlocked] = useState(false);
  const lastSentRef = useRef(0);

  const bridgeReady = status.online && status.connectionState === 'connected';
  const topics = debugStatus?.topics ?? {};
  const nodes = debugStatus?.nodes ?? {};
  const odomAge = debugStatus?.lastOdomAgeSec ?? status.lastOdomAgeSec;
  const scanAge = debugStatus?.lastScanAgeSec ?? status.lastScanAgeSec;
  const imuAge = debugStatus?.lastImuAgeSec;
  const fresh =
    topics['/odom'] &&
    topics['/scan'] &&
    topics['/imu/data'] &&
    nodes.tf &&
    odomAge != null &&
    scanAge != null &&
    imuAge != null &&
    freshnessTone(odomAge) !== 'danger' &&
    freshnessTone(scanAge) !== 'danger' &&
    freshnessTone(imuAge) !== 'danger';
  const movementDisabled = !unlocked || !bridgeReady || !fresh || pending.velocity;

  useEffect(() => {
    if (!unlocked) {
      return undefined;
    }
    const timer = setTimeout(() => setUnlocked(false), LOCK_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [unlocked, pending.velocity]);

  const blockReason = useMemo(() => {
    if (!bridgeReady) return 'Bridge 断开或未连接，运动按钮已禁用。';
    if (!fresh) return '底盘前置条件未就绪：需要 /odom、/scan、/imu/data、TF 且数据新鲜。';
    if (!unlocked) return '控制锁已锁定，解锁后才能发送运动命令。';
    return '控制已解锁，10 秒无操作会自动上锁。';
  }, [bridgeReady, fresh, unlocked]);

  const send = (linear: number, angular: number) => {
    const now = Date.now();
    if (now - lastSentRef.current < THROTTLE_MS) {
      robotActions.addLog('warn', '底盘命令被 200ms 节流拦截', undefined, '底盘控制');
      return;
    }
    lastSentRef.current = now;
    setUnlocked(true);
    command(linear, angular);
  };

  return (
    <View style={styles.panel}>
      <HelpText tone="warning">
        本页面用于低速点动测试底盘。每次点击只发送短时速度命令，后端会自动停车。首次测试请架空轮子。
      </HelpText>
      <View style={styles.lockRow}>
        <Text style={styles.lockText}>{unlocked ? '控制锁：已解锁' : '控制锁：已锁定'}</Text>
        <AppButton
          label={unlocked ? '立即上锁' : '解锁控制'}
          variant={unlocked ? 'secondary' : 'warning'}
          onPress={() => setUnlocked((value) => !value)}
          style={styles.lockButton}
        />
      </View>
      <HelpText tone={movementDisabled ? 'warning' : 'success'}>{blockReason}</HelpText>
      <View style={styles.grid}>
        <AppButton label="前进" description="0.03 m/s，300ms" disabled={movementDisabled} loading={pending.velocity} onPress={() => send(0.03, 0)} style={styles.full} />
        <AppButton label="左转" description="0.15 rad/s，300ms" disabled={movementDisabled} loading={pending.velocity} onPress={() => send(0, 0.15)} style={styles.third} />
        <AppButton label="停止" description="发送全局 STOP" variant="secondary" loading={pending.stop} onPress={() => robotActions.stop()} style={styles.third} />
        <AppButton label="右转" description="-0.15 rad/s，300ms" disabled={movementDisabled} loading={pending.velocity} onPress={() => send(0, -0.15)} style={styles.third} />
        <AppButton label="后退" description="-0.03 m/s，300ms" disabled={movementDisabled} loading={pending.velocity} onPress={() => send(-0.03, 0)} style={styles.full} />
        <AppButton label="急停" description="无需解锁，立即请求停车" variant="danger" loading={pending.stop} onPress={() => robotActions.stop()} style={styles.full} />
      </View>
    </View>
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
  full: {
    width: '100%',
  },
  third: {
    flex: 1,
    minWidth: 96,
  },
});
