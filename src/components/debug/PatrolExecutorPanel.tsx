import { useEffect, useRef } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { PatrolEvent, PatrolState } from '../../api/types';
import { AppButton } from '../AppButton';
import { HelpText } from '../HelpText';
import { SectionCard } from '../SectionCard';
import { StatusCard } from '../StatusCard';
import { colors, radius } from '../../theme/consoleTheme';
import { robotActions, useRobotStore } from '../../store/robotStore';
import { patrolEventLabel, patrolStateLabel, patrolStateTone } from '../../utils/status';

const RUNNING_STATES: PatrolState[] = ['running', 'returning_home', 'waiting_loop', 'waiting_schedule'];
const RELOAD_ALLOWED_STATES: PatrolState[] = ['idle', 'succeeded', 'failed', 'canceled'];

export function PatrolExecutorPanel() {
  const { patrolStatus, patrolEvents, pending, refreshIntervalMs, mockMode } = useRobotStore((snapshot) => ({
    patrolStatus: snapshot.patrolStatus,
    patrolEvents: snapshot.patrolEvents,
    pending: snapshot.pending,
    refreshIntervalMs: snapshot.refreshIntervalMs,
    mockMode: snapshot.mockMode,
  }));

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const refresh = () => {
      robotActions.refreshPatrolStatus();
      robotActions.refreshPatrolEvents();
    };
    refresh();
    intervalRef.current = setInterval(refresh, refreshIntervalMs);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refreshIntervalMs]);

  const state = patrolStatus?.state ?? 'idle';
  const isRunning = RUNNING_STATES.includes(state);
  const canReload = RELOAD_ALLOWED_STATES.includes(state);

  // 确认弹窗（start/resume/initialize/startPatrolProcess）
  const confirm = (action: () => void) => () =>
    Alert.alert('确认操作', '此操作会向机器人本地 patrol_executor 发送命令，确认执行？', [
      { text: '取消', style: 'cancel' },
      { text: '确认', onPress: action },
    ]);

  const cancelPatrol = () =>
    Alert.alert('取消巡检', '取消后不会自动返航，机器人将停在当前位置。确认取消？', [
      { text: '返回', style: 'cancel' },
      { text: '确认取消', style: 'destructive', onPress: () => robotActions.cancelPatrol() },
    ]);

  const stateTone = patrolStateTone(state);

  return (
    <SectionCard
      title="本地巡逻控制"
      description="控制机器人本地 patrol_executor_node 状态机（路线由机器人本地自主执行）。"
    >
      {!mockMode ? (
        <HelpText tone="warning">真机模式：机器人端 /api/debug/patrol/* 接口若未实现，状态与命令将无法生效。</HelpText>
      ) : null}

      <View style={styles.stateRow}>
        <StatusCard title="patrol 状态" value={patrolStateLabel[state]} tone={stateTone} />
        <StatusCard title="route_id" value={patrolStatus?.route_id} />
        <StatusCard title="target_id" value={patrolStatus?.target_id} />
        <StatusCard title="target 进度" value={`${patrolStatus?.target_index ?? 0} / ${patrolStatus?.target_count ?? 0}`} />
        <StatusCard title="cycle_index" value={patrolStatus?.cycle_index ?? 0} />
        <StatusCard title="loop_wait_sec" value={patrolStatus?.loop_wait_sec} />
      </View>

      {state === 'failed' && patrolStatus?.last_error ? (
        <HelpText tone="danger">巡检失败：{patrolStatus.last_error}</HelpText>
      ) : null}

      <View style={styles.buttonRow}>
        <AppButton
          label="启动 patrol_executor 进程"
          variant="secondary"
          loading={pending.patrol}
          disabled={isRunning}
          onPress={confirm(() => robotActions.startPatrolProcess())}
          style={styles.button}
        />
        <AppButton
          label="开始默认路线"
          variant="warning"
          loading={pending.patrol}
          disabled={isRunning}
          onPress={confirm(() => robotActions.startPatrol())}
          style={styles.button}
        />
        <AppButton
          label="暂停"
          variant="warning"
          loading={pending.patrol}
          disabled={!isRunning}
          onPress={() => robotActions.pausePatrol()}
          style={styles.button}
        />
        <AppButton
          label="恢复"
          variant="secondary"
          loading={pending.patrol}
          disabled={state !== 'paused'}
          onPress={confirm(() => robotActions.resumePatrol())}
          style={styles.button}
        />
        <AppButton
          label="取消巡检（不返航）"
          variant="danger"
          loading={pending.patrol}
          disabled={!isRunning}
          onPress={cancelPatrol}
          style={styles.button}
        />
        <AppButton
          label="重新加载路线"
          variant="secondary"
          loading={pending.patrol}
          disabled={!canReload}
          onPress={() => robotActions.reloadPatrolRoute()}
          style={styles.button}
        />
        <AppButton
          label="重新发布初始位姿"
          variant="secondary"
          loading={pending.patrol}
          disabled={!canReload}
          onPress={confirm(() => robotActions.initializePatrolPose())}
          style={styles.button}
        />
        <AppButton label="刷新状态" variant="ghost" loading={pending.patrol} onPress={() => { robotActions.refreshPatrolStatus(); robotActions.refreshPatrolEvents(); }} style={styles.button} />
      </View>

      <View style={styles.eventsHeader}>
        <Text style={styles.eventsTitle}>最近巡逻事件</Text>
      </View>
      <PatrolEventList events={patrolEvents.slice(0, 10)} />
    </SectionCard>
  );
}

function PatrolEventList({ events }: { events: PatrolEvent[] }) {
  if (!events.length) {
    return <Text style={styles.empty}>暂无巡逻事件</Text>;
  }
  return (
    <View style={styles.eventPanel}>
      {events.map((event, i) => (
        <View key={`${event.timestamp}-${i}`} style={styles.eventItem}>
          <View style={styles.eventMeta}>
            <Text style={[styles.eventType, event.type === 'route_failed' ? styles.eventFail : styles.eventNormal]}>
              {patrolEventLabel[event.type] ?? event.type}
            </Text>
            <Text style={styles.eventTarget}>{event.target_id ?? ''}</Text>
            <Text style={styles.eventTime}>{new Date(event.timestamp).toLocaleTimeString()}</Text>
          </View>
          {event.message ? <Text style={styles.eventMessage} selectable>{event.message}</Text> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  button: {
    flex: 1,
    minWidth: 140,
  },
  eventsHeader: {
    marginTop: 4,
  },
  eventsTitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  eventPanel: {
    gap: 8,
  },
  empty: {
    padding: 16,
    color: colors.textMuted,
    textAlign: 'center',
  },
  eventItem: {
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    gap: 6,
  },
  eventMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  eventType: {
    fontSize: 12,
    fontWeight: '900',
  },
  eventNormal: {
    color: '#79c0ff',
  },
  eventFail: {
    color: '#ff938a',
  },
  eventTarget: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: '700',
  },
  eventTime: {
    color: colors.textSubtle,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  eventMessage: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
});
