import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { PatrolRouteMapInfo, PatrolTarget } from '../../api/types';
import { robotActions, useRobotStore } from '../../store/robotStore';
import { colors } from '../../theme/consoleTheme';
import { mapToPixel } from '../../utils/routeProjection';
import { AppButton } from '../AppButton';
import { HelpText } from '../HelpText';
import { SectionCard } from '../SectionCard';
import { StatusCard } from '../StatusCard';

type Props = {
  showManualNav?: boolean;
};

export function RouteMapPanel({ showManualNav = false }: Props) {
  const { routeMap, activeRoute, pending } = useRobotStore((snapshot) => ({
    routeMap: snapshot.routeMap,
    activeRoute: snapshot.activeRoute,
    pending: snapshot.pending,
  }));
  const [showManual, setShowManual] = useState(false);
  const [manualLabel, setManualLabel] = useState('巡检目标');
  const [manualX, setManualX] = useState('1.0');
  const [manualY, setManualY] = useState('0.5');
  const [manualYaw, setManualYaw] = useState('0.0');

  useEffect(() => {
    robotActions.refreshRouteView();
  }, []);

  const routeFile = activeRoute?.route;
  const activeRouteDef = useMemo(
    () => (routeFile ? routeFile.routes.find((route) => route.id === routeFile.active_route_id) : undefined),
    [routeFile],
  );
  const startPose = routeFile?.start_pose;

  const setStartAsInitialPose = () => {
    if (!startPose) return;
    robotActions.setInitialPose({ x: startPose.pose.x, y: startPose.pose.y, yaw: startPose.pose.yaw });
  };

  const sendTargetGoal = (target: PatrolTarget) => {
    robotActions.sendNavigationGoal({ x: target.pose.x, y: target.pose.y, yaw: target.pose.yaw, label: target.name });
  };

  const sendManualGoal = () => {
    robotActions.sendNavigationGoal({
      x: Number(manualX) || 0,
      y: Number(manualY) || 0,
      yaw: Number(manualYaw) || 0,
      label: manualLabel,
    });
  };

  if (!routeMap) {
    return (
      <SectionCard title="路线调试" description="加载 route_patrol_*.json 路线文件。">
        <HelpText tone="danger">未加载路线地图（机器人端未实现 GET /api/debug/route/map 或请求失败）。</HelpText>
        <AppButton label="刷新路线文件" variant="secondary" loading={pending.route} onPress={() => robotActions.refreshRouteView()} />
      </SectionCard>
    );
  }

  if (!activeRoute || !routeFile) {
    return (
      <SectionCard title="路线调试" description="加载 route_patrol_*.json 路线文件。">
        <HelpText tone="danger">未加载路线文件（机器人端未实现 GET /api/debug/route/active 或请求失败）。</HelpText>
        <AppButton label="刷新路线文件" variant="secondary" loading={pending.route} onPress={() => robotActions.refreshRouteView()} />
      </SectionCard>
    );
  }

  const frameOk = routeFile.frame_id === 'map';
  const targets = routeFile.targets;
  const targetIds = activeRouteDef?.target_ids ?? [];
  const orderedTargets = targetIds
    .map((id) => targets.find((target) => target.id === id))
    .filter((target): target is PatrolTarget => Boolean(target));
  const missingTargetIds = targetIds.filter((id) => !targets.some((target) => target.id === id));

  return (
    <SectionCard
      title="路线调试"
      description="当前 mobile_debug_api.md 阶段不要求巡检执行；此页保留路线文件查看与单点导航调试。"
      summary={<Text style={styles.fileName}>{activeRoute.file_name}</Text>}
    >
      <RouteMapPreview
        map={routeMap}
        frameOk={frameOk}
        startPose={startPose?.pose}
        targets={orderedTargets}
        onTargetPress={sendTargetGoal}
      />

      {!frameOk ? <HelpText tone="warning">路线 frame_id={routeFile.frame_id}，移动端仅支持 map 坐标系。</HelpText> : null}
      {!activeRouteDef ? <HelpText tone="danger">路线文件错误：未找到活动路线 {routeFile.active_route_id}。</HelpText> : null}
      {missingTargetIds.length ? <HelpText tone="danger">路线文件错误：target {missingTargetIds.join(', ')} 未定义。</HelpText> : null}
      {activeRoute.validation.ok === false ? <HelpText tone="warning">路线校验失败：{activeRoute.validation.message ?? '未知原因'}</HelpText> : null}

      <View style={styles.summaryGrid}>
        <StatusCard title="路线文件" value={activeRoute.file_name} />
        <StatusCard title="active_route_id" value={routeFile.active_route_id} />
        <StatusCard title="route.name" value={activeRouteDef?.name} />
        <StatusCard title="target_count" value={activeRouteDef?.target_ids.length ?? 0} />
        <StatusCard title="loop" value={activeRouteDef?.loop?.enabled ? `开启 / ${activeRouteDef.loop.wait_sec ?? 0}s` : '关闭'} />
        <StatusCard title="schedule" value={routeFile.schedules.some((schedule) => schedule.enabled) ? '开启' : '关闭'} />
        <StatusCard title="return_to_start" value={activeRouteDef?.return_to_start ? '是' : '否'} />
        <StatusCard title="validation" value={activeRoute.validation.ok ? '通过' : '失败'} />
      </View>

      <View style={styles.buttonRow}>
        <AppButton label="刷新路线文件" variant="secondary" loading={pending.route} onPress={() => robotActions.refreshRouteView()} style={styles.button} />
        <AppButton label="刷新地图" variant="secondary" loading={pending.route} onPress={() => robotActions.refreshRouteMap()} style={styles.button} />
        <AppButton label="设置 start_pose 为初始位姿" variant="warning" loading={pending.navigation} disabled={!startPose} onPress={setStartAsInitialPose} style={styles.button} />
        <AppButton label="启动 Nav2" variant="warning" loading={pending.navigation} onPress={() => robotActions.startNavigation()} style={styles.button} />
        <AppButton label="取消单点导航" variant="danger" loading={pending.navigation} onPress={() => robotActions.cancelNavigation()} style={styles.button} />
      </View>

      {showManualNav ? (
        <View style={styles.manualSection}>
          <AppButton
            label={showManual ? '收起手动单点导航调试' : '展开手动单点导航调试'}
            variant="ghost"
            onPress={() => setShowManual((value) => !value)}
          />
          {showManual ? (
            <View style={styles.manualBody}>
              <HelpText tone="warning">风险提示：发送目标点可能导致机器人移动。请确认地图、定位和周边环境安全。</HelpText>
              <View style={styles.inputGrid}>
                <Input label="目标名称" value={manualLabel} onChangeText={setManualLabel} />
                <Input label="x" value={manualX} onChangeText={setManualX} numeric />
                <Input label="y" value={manualY} onChangeText={setManualY} numeric />
                <Input label="yaw" value={manualYaw} onChangeText={setManualYaw} numeric />
              </View>
              <View style={styles.buttonRow}>
                <AppButton label="设置初始位姿" variant="warning" loading={pending.navigation} onPress={() => robotActions.setInitialPose({ x: Number(manualX) || 0, y: Number(manualY) || 0, yaw: Number(manualYaw) || 0 })} style={styles.button} />
                <AppButton label="发送目标点" variant="warning" loading={pending.navigation} onPress={sendManualGoal} style={styles.button} />
                <AppButton label="取消导航" variant="danger" loading={pending.navigation} onPress={() => robotActions.cancelNavigation()} style={styles.button} />
              </View>
            </View>
          ) : null}
        </View>
      ) : null}
    </SectionCard>
  );
}

function RouteMapPreview({
  map,
  frameOk,
  startPose,
  targets,
  onTargetPress,
}: {
  map: PatrolRouteMapInfo;
  frameOk: boolean;
  startPose?: { x: number; y: number; yaw: number };
  targets: PatrolTarget[];
  onTargetPress: (target: PatrolTarget) => void;
}) {
  const aspectRatio = map.width / map.height;
  const startPx = startPose && frameOk ? mapToPixel(startPose.x, startPose.y, map) : null;
  const targetPoints = frameOk ? targets.map((target) => ({ target, px: mapToPixel(target.pose.x, target.pose.y, map) })) : [];

  return (
    <View style={[styles.mapWrap, { aspectRatio }]}> 
      <View style={styles.gridLayer}>
        {Array.from({ length: 9 }, (_, index) => <View key={`v-${index}`} style={[styles.gridV, { left: `${index * 12.5}%` }]} />)}
        {Array.from({ length: 7 }, (_, index) => <View key={`h-${index}`} style={[styles.gridH, { top: `${index * 16.666}%` }]} />)}
      </View>
      {startPx ? (
        <View style={[styles.startPoint, { left: `${(startPx.x / map.width) * 100}%`, top: `${(startPx.y / map.height) * 100}%` }]}>
          <Text style={styles.pointText}>H</Text>
        </View>
      ) : null}
      {targetPoints.map(({ target, px }, index) => (
        <TouchableOpacity
          key={target.id}
          activeOpacity={0.8}
          onPress={() => onTargetPress(target)}
          style={[styles.targetPoint, { left: `${(px.x / map.width) * 100}%`, top: `${(px.y / map.height) * 100}%` }]}
        >
          <Text style={styles.pointText}>{index + 1}</Text>
        </TouchableOpacity>
      ))}
      <View style={styles.mapCaption}>
        <Text style={styles.mapCaptionText}>{map.map_name} · {map.width} x {map.height} · {map.resolution}m</Text>
      </View>
    </View>
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
  mapWrap: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.bgElevated,
    position: 'relative',
  },
  gridLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.input,
  },
  gridV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: colors.border,
  },
  gridH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.border,
  },
  startPoint: {
    position: 'absolute',
    width: 24,
    height: 24,
    marginLeft: -12,
    marginTop: -12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.bg,
  },
  targetPoint: {
    position: 'absolute',
    width: 24,
    height: 24,
    marginLeft: -12,
    marginTop: -12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.bg,
  },
  pointText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
  },
  mapCaption: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(7, 16, 24, 0.82)',
  },
  mapCaptionText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  fileName: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  summaryGrid: {
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
  manualSection: {
    gap: 10,
  },
  manualBody: {
    gap: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.panelSoft,
  },
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