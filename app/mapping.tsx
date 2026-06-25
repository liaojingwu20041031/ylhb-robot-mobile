import { Link } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../src/components/AppButton';
import { ControlPad } from '../src/components/ControlPad';
import { FreshnessBadge } from '../src/components/FreshnessBadge';
import { GlobalSafetyBar } from '../src/components/GlobalSafetyBar';
import { HelpText } from '../src/components/HelpText';
import { SectionCard } from '../src/components/SectionCard';
import { StatusCard } from '../src/components/StatusCard';
import { colors } from '../src/theme/consoleTheme';
import { stateTone } from '../src/utils/status';
import { robotActions, useRobotStore } from '../src/store/robotStore';

const MAP_NAME_RE = /^[A-Za-z0-9_-]+$/;

export default function MappingPage() {
  const insets = useSafeAreaInsets();
  const { debugStatus, systemStatus, mappingStatus, mapSnapshot, savedMap, pending, mapSource, mapStreamConnected, lastMapError } = useRobotStore((snapshot) => ({
    debugStatus: snapshot.debugStatus,
    systemStatus: snapshot.systemStatus,
    mappingStatus: snapshot.mappingStatus,
    mapSnapshot: snapshot.mapSnapshot,
    savedMap: snapshot.savedMap,
    pending: snapshot.pending,
    mapSource: snapshot.mapSource,
    mapStreamConnected: snapshot.mapStreamConnected,
    lastMapError: snapshot.lastMapError,
  }));
  const [mapName, setMapName] = useState('site_map');
  const mapNameValid = useMemo(() => MAP_NAME_RE.test(mapName), [mapName]);

  useEffect(() => {
    robotActions.refreshDebugStatus();
    robotActions.refreshSystemStatus();
    robotActions.refreshMappingStatus();
    robotActions.startMapStream(1);
    const timer = setInterval(() => {
      robotActions.refreshMappingStatus();
      robotActions.refreshDebugStatus();
      if (!mapStreamConnected) {
        robotActions.refreshMapSnapshot(1);
      }
    }, 1000);
    return () => {
      clearInterval(timer);
      robotActions.stopMapStream();
    };
  }, [mapStreamConnected]);

  const topic = (name: string) => debugStatus?.topics?.[name];
  const node = (name: string) => debugStatus?.nodes?.[name];
  const imageUri = mapSnapshot?.png_base64 ? `data:image/png;base64,${mapSnapshot.png_base64}` : undefined;
  const mapServerConflict = Boolean(debugStatus?.nodes?.map_server) && !mappingStatus?.mapAvailable;
  const nextAction = mappingStatus?.recommendedNextAction ?? 'start_bringup';
  const nextActionText: Record<string, string> = {
    start_bringup: '先启动底盘 bringup',
    start_mapping: '底盘已就绪，可以开始建图',
    wait_for_map: '建图启动中，等待当前 SLAM 地图',
    continue_mapping_or_save: '地图可用，可以继续建图或保存',
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={styles.scroll}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View style={styles.heading}>
            <Text style={styles.title}>建图调试</Text>
            <Text style={styles.subtitle}>一边低速移动机器人，一边看 /map 快照增长。</Text>
          </View>
          <Link href="/" style={styles.home}>
            首页
          </Link>
        </View>
        <GlobalSafetyBar />

      <SectionCard
        title="地图预览"
        description="优先使用 /ws/map?downsample=1；WebSocket 断开后静默回退 HTTP 快照。"
        summary={<Text style={styles.source}>来源：{mapSource.toUpperCase()} {mapStreamConnected ? '已连接' : '未连接'}</Text>}
        actions={<AppButton label="立即刷新地图" variant="secondary" loading={pending.mapSnapshotPending} onPress={() => robotActions.refreshMapSnapshot(1, true)} style={styles.action} />}
      >
        <View style={styles.mapBox}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} resizeMode="contain" style={styles.mapImage} />
          ) : (
            <View style={styles.emptyMap}>
              <Text style={styles.emptyTitle}>等待当前 SLAM 地图</Text>
              <Text style={styles.emptyText}>
                {mapServerConflict
                  ? 'map_server 正在运行，bridge 已拒绝返回地图以避免旧地图误显示。'
                  : lastMapError ?? nextActionText[nextAction] ?? '刚启动、传感器/TF 未就绪或 mapping 已停止时会返回 no_map。'}
              </Text>
            </View>
          )}
        </View>
      </SectionCard>

      <SectionCard
        title="底层状态"
        description="启动底层后等待 /odom、/scan 和 TF 可用。关闭底层前会先停止建图。"
        actions={
          <View style={styles.actions}>
            <AppButton label="启动底层" loading={pending.systemPending} onPress={() => robotActions.startBringup()} style={styles.action} />
            <AppButton label="关闭底层" variant="warning" loading={pending.systemPending} onPress={() => robotActions.stopBringup()} style={styles.action} />
          </View>
        }
      >
        <View style={styles.grid}>
          <StatusCard title="底层进程（bringup）" value={systemStatus?.bringup?.running} tone={stateTone(systemStatus?.bringup?.running)} />
          <StatusCard title="/odom" value={topic('/odom')} tone={stateTone(topic('/odom'))} />
          <StatusCard title="/scan" value={topic('/scan')} tone={stateTone(topic('/scan'))} />
          <StatusCard title="TF" value={node('tf')} tone={stateTone(node('tf'))} />
        </View>
        {systemStatus?.bringup && !systemStatus.bringup.managed_by_bridge ? (
          <HelpText tone="warning">该 bringup 进程不是本 APP/bridge 启动，需要回到原 SSH/终端停止。</HelpText>
        ) : null}
      </SectionCard>

      <SectionCard
        title="建图状态"
        description="启动 mapping 后等待 slam_toolbox 和 /map。"
        actions={
          <View style={styles.actions}>
            <AppButton label="启动建图" loading={pending.mappingStatusPending} onPress={() => robotActions.startMapping()} style={styles.action} />
            <AppButton label="停止建图" variant="warning" loading={pending.mappingStatusPending} onPress={() => robotActions.stopMapping()} style={styles.action} />
          </View>
        }
      >
        <View style={styles.grid}>
          <StatusCard title="建图进程（mapping）" value={systemStatus?.mapping?.running} tone={stateTone(systemStatus?.mapping?.running)} />
          <StatusCard title="建图状态（mapping status）" value={mappingStatus?.mappingStatus} />
          <StatusCard title="地图可用（map_available）" value={mappingStatus?.mapAvailable} tone={stateTone(mappingStatus?.mapAvailable)} />
          <StatusCard title="map_server" value={node('map_server')} tone={node('map_server') ? 'danger' : 'success'} />
          <StatusCard title="slam_toolbox" value={node('slam_toolbox')} tone={stateTone(node('slam_toolbox'))} />
          <StatusCard title="/map" value={topic('/map')} tone={stateTone(topic('/map'))} />
        </View>
        {mapServerConflict ? (
          <HelpText tone="danger">外部导航/静态地图服务正在运行，bridge 为避免旧地图混淆拒绝返回地图。请先停止原导航或 map_server。</HelpText>
        ) : null}
        <View style={styles.freshRow}>
          <Text style={styles.label}>地图新鲜度（last_map_age_sec）</Text>
          <FreshnessBadge age={mappingStatus?.lastMapAgeSec ?? debugStatus?.lastMapAgeSec ?? undefined} />
        </View>
      </SectionCard>

      <SectionCard
        title="保存地图"
        description="地图名只能包含英文字母、数字、下划线和短横线。"
        actions={
          <AppButton
            label="保存地图"
            disabled={!mapNameValid || !mappingStatus?.mapAvailable}
            loading={pending.mapSavePending}
            onPress={() => robotActions.saveMapping({ map_name: mapName })}
            style={styles.action}
          />
        }
      >
        <TextInput
          style={[styles.input, !mapNameValid && styles.inputInvalid]}
          value={mapName}
          onChangeText={setMapName}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="site_map"
          placeholderTextColor={colors.textSubtle}
        />
        {!mapNameValid ? <HelpText tone="warning">map_name 不合法：只能使用 A-Z、a-z、0-9、_、-。</HelpText> : null}
        {!mappingStatus?.mapAvailable ? <HelpText tone="warning">保存按钮仅在 map_available=true 后启用。</HelpText> : null}
        {savedMap ? (
          <View style={styles.savedBox}>
            <Text style={styles.savedLine}>yaml_path：{savedMap.yaml_path}</Text>
            <Text style={styles.savedLine}>pgm_path：{savedMap.pgm_path}</Text>
            {savedMap.output ? <Text style={styles.savedOutput} numberOfLines={5}>{savedMap.output}</Text> : null}
          </View>
        ) : null}
      </SectionCard>
      </ScrollView>

      <View style={[styles.fixedControl, { paddingBottom: Math.max(10, insets.bottom) }]}>
        <Text style={styles.fixedTitle}>建图点动控制</Text>
        <ControlPad mode="mapping" compact />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 14,
    gap: 14,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  heading: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.text,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  home: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.panelSoft,
    borderColor: colors.border,
    borderWidth: 1,
    color: colors.text,
    overflow: 'hidden',
    fontWeight: '800',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  action: {
    flex: 1,
    minWidth: 140,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  freshRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  label: {
    color: colors.textMuted,
    fontWeight: '800',
  },
  mapBox: {
    height: 260,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  emptyMap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    gap: 8,
  },
  emptyTitle: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 18,
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: colors.input,
    color: colors.text,
  },
  inputInvalid: {
    borderColor: colors.warning,
  },
  savedBox: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    padding: 12,
    gap: 6,
  },
  savedLine: {
    color: colors.text,
    fontSize: 12,
  },
  savedOutput: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  source: {
    color: colors.textMuted,
    fontWeight: '800',
  },
  fixedControl: {
    paddingTop: 10,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    gap: 8,
  },
  fixedTitle: {
    color: colors.text,
    fontWeight: '900',
  },
});
