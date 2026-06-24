import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/consoleTheme';
import { freshnessTone, stateTone, textOrUnknown } from '../utils/status';
import { robotActions, useRobotStore } from '../store/robotStore';
import { AppButton } from './AppButton';
import { FreshnessBadge } from './FreshnessBadge';
import { StatusBadge } from './StatusBadge';

export function GlobalSafetyBar() {
  const { status, pending } = useRobotStore((snapshot) => ({
    status: snapshot.status,
    pending: snapshot.pending,
  }));
  return (
    <View style={styles.bar}>
      <View style={styles.header}>
        <Text style={styles.title}>全局安全状态</Text>
        <AppButton
          label="全局 STOP"
          variant="danger"
          loading={pending.controlPending}
          onPress={() => robotActions.emergencyStop()}
          style={styles.stop}
        />
      </View>
      <View style={styles.grid}>
        <Metric label="模式" value="Real" tone="danger" />
        <Metric label="Bridge" value={textOrUnknown(status.connectionState)} tone={stateTone(status.connectionState)} />
        <Metric label="ZLAC/CAN" value={`${textOrUnknown(status.zlacStatus)} / ${textOrUnknown(status.canStatus)}`} tone={stateTone(status.zlacStatus ?? status.canStatus)} />
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>/odom</Text>
          <FreshnessBadge age={status.lastOdomAgeSec} />
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>/scan</Text>
          <FreshnessBadge age={status.lastScanAgeSec} />
        </View>
        <Metric label="mapping" value={textOrUnknown(status.mappingStatus)} tone={stateTone(status.mappingStatus)} />
      </View>
      <Text style={styles.realWarning} selectable>
        真实模式会直接向机器人发送控制命令。请确认机器人周围安全，首次测试请架空轮子。
      </Text>
      {(freshnessTone(status.lastOdomAgeSec) === 'danger' || freshnessTone(status.lastScanAgeSec) === 'danger') ? (
        <Text style={styles.warning} selectable>
          风险提示：关键传感数据过期，禁止进行运动、建图或导航验收。
        </Text>
      ) : null}
    </View>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'stale';
}) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <StatusBadge label={value} tone={tone} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.bgElevated,
    borderColor: colors.borderStrong,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  stop: {
    minWidth: 112,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metric: {
    minWidth: 96,
    flexGrow: 1,
    gap: 4,
  },
  metricLabel: {
    color: colors.textSubtle,
    fontSize: 11,
    fontWeight: '700',
  },
  realWarning: {
    color: '#ff938a',
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
    lineHeight: 17,
  },
  warning: {
    color: '#f2cc60',
    backgroundColor: colors.warningSoft,
    borderColor: colors.warning,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
    lineHeight: 17,
  },
});
