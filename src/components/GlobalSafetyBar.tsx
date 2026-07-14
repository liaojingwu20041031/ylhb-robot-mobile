import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/consoleTheme';
import { stateTone } from '../utils/status';
import { booleanStateText, connectionStateText } from '../utils/displayText';
import { robotActions, useRobotStore } from '../store/robotStore';
import { AppButton } from './AppButton';
import { StatusBadge } from './StatusBadge';

export function GlobalSafetyBar() {
  const { status, pending } = useRobotStore((snapshot) => ({
    status: snapshot.status,
    pending: snapshot.pending,
  }));
  return (
    <View style={styles.bar}>
      <View style={styles.header}>
        <View style={styles.copy}>
          <Text style={styles.title}>安全操作</Text>
          <View style={styles.grid}>
            <Metric label="机器人连接" value={connectionStateText(status.connectionState)} tone={stateTone(status.connectionState)} />
            <Metric label="运动通道" value={booleanStateText(status.online)} tone={stateTone(status.online)} />
          </View>
        </View>
        <AppButton
          label="紧急停止"
          variant="danger"
          loading={pending.controlPending}
          onPress={() => robotActions.emergencyStop()}
          style={styles.stop}
          accessibilityLabel="紧急停止机器人"
          accessibilityHint="立即停止机器人运动"
        />
      </View>
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
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
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
    fontWeight: '700',
  },
  copy: {
    flex: 1,
    gap: 8,
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
});
