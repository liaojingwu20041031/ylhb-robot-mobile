import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { AppButton } from '@/components/AppButton';
import { ControlPad } from '@/components/ControlPad';
import { GlobalSafetyBar } from '@/components/GlobalSafetyBar';
import { HelpText } from '@/components/HelpText';
import { SectionCard } from '@/components/SectionCard';
import { StatusCard } from '@/components/StatusCard';
import { robotActions, useRobotStore } from '@/store/robotStore';
import { colors, radius } from '@/theme/consoleTheme';
import { booleanStateText, mapSourceText, mappingStateText, processStateText } from '@/utils/displayText';

const MAP_NAME_RE = /^[A-Za-z0-9_-]+$/;

export default function MappingPage() {
  const { width } = useWindowDimensions();
  const { debugStatus, systemStatus, mappingStatus, mapSnapshot, savedMap, pending, mapSource, mapStreamConnected, lastMapError } = useRobotStore((s) => ({
    debugStatus: s.debugStatus, systemStatus: s.systemStatus, mappingStatus: s.mappingStatus, mapSnapshot: s.mapSnapshot,
    savedMap: s.savedMap, pending: s.pending, mapSource: s.mapSource, mapStreamConnected: s.mapStreamConnected, lastMapError: s.lastMapError,
  }));
  const [mapName, setMapName] = useState('site_map');
  const [showDetails, setShowDetails] = useState(false);
  const mapNameValid = useMemo(() => MAP_NAME_RE.test(mapName), [mapName]);

  useEffect(() => {
    robotActions.refreshDebugStatus(); robotActions.refreshSystemStatus(); robotActions.refreshMappingStatus(); robotActions.startMapStream(1);
    return () => { robotActions.stopMapStream(); };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      robotActions.refreshSystemStatus(); robotActions.refreshMappingStatus(); robotActions.refreshDebugStatus();
      if (!mapStreamConnected) robotActions.refreshMapSnapshot(1);
    }, 1000);
    return () => { clearInterval(timer); };
  }, [mapStreamConnected]);

  const imageUri = mapSnapshot?.png_base64 ? `data:image/png;base64,${mapSnapshot.png_base64}` : undefined;
  const mapServerConflict = Boolean(debugStatus?.nodes?.map_server) && !mappingStatus?.mapAvailable;
  const bringupDone = Boolean(systemStatus?.bringup?.running);
  const mappingDone = Boolean(mappingStatus?.mapAvailable);
  const mappingRunning = Boolean(systemStatus?.mapping?.running);
  const mapHeight = width >= 700 ? 480 : width >= 430 ? 400 : 320;

  return (
    <View style={styles.screen}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <View><Text style={styles.title}>实时建图</Text><Text style={styles.subtitle}>移动机器人并观察地图逐步生成</Text></View>
        <GlobalSafetyBar />
        <SectionCard title="实时地图" description={mapSourceText(mapSource)} summary={<Text style={styles.source}>{mapStreamConnected ? '连接正常' : '自动轮询'}</Text>} actions={<AppButton label="刷新地图" variant="secondary" loading={pending.mapSnapshotPending} onPress={() => robotActions.refreshMapSnapshot(1, true)} />}>
          <View style={[styles.mapBox, { height: mapHeight }]}>
            {imageUri ? <Image source={{ uri: imageUri }} resizeMode="contain" style={styles.mapImage} /> : <View style={styles.emptyMap}><Ionicons name="map-outline" size={36} color={colors.textSubtle} /><Text style={styles.emptyTitle}>等待地图数据</Text><Text style={styles.emptyText}>{mapServerConflict ? '检测到静态地图服务，请先停止旧导航服务。' : lastMapError ?? '启动基础驱动和建图服务后，地图会显示在这里。'}</Text></View>}
          </View>
        </SectionCard>

        <SectionCard title="建图流程">
          <View style={styles.steps}>
            <Step number="1" title="基础驱动" state={bringupDone ? '已完成' : '未开始'} done={bringupDone} />
            <Step number="2" title="开始建图" state={mappingDone ? '已完成' : mappingRunning ? '进行中' : '未开始'} done={mappingDone} active={mappingRunning} />
            <Step number="3" title="保存地图" state={savedMap ? '已完成' : '未开始'} done={Boolean(savedMap)} />
          </View>
          <View style={styles.actions}>
            <AppButton label="启动基础驱动" loading={pending.systemPending} onPress={() => robotActions.startBringup()} style={styles.action} />
            <AppButton label="开始建图" loading={pending.mappingStatusPending} onPress={() => robotActions.startMapping()} style={styles.action} />
            <AppButton label="停止建图" variant="warning" loading={pending.mappingStatusPending} onPress={() => robotActions.stopMapping()} style={styles.action} />
          </View>
        </SectionCard>

        <SectionCard title="保存地图" description="地图文件名仅支持英文字母、数字、下划线和短横线。" actions={<AppButton label="保存地图" disabled={!mapNameValid || !mappingStatus?.mapAvailable} loading={pending.mapSavePending} onPress={() => robotActions.saveMapping({ map_name: mapName })} />}>
          <View style={styles.inputBox}><Text style={styles.label}>地图名称</Text><TextInput accessibilityLabel="地图名称" style={[styles.input, !mapNameValid && styles.inputInvalid]} value={mapName} onChangeText={setMapName} autoCapitalize="none" autoCorrect={false} placeholder="site_map" placeholderTextColor={colors.textSubtle} /></View>
          {!mapNameValid ? <HelpText tone="warning">地图文件名仅支持英文字母、数字、下划线和短横线。</HelpText> : null}
          {savedMap ? <View style={styles.saved}><Text style={styles.savedTitle}>地图“{mapName}”已保存</Text><Pressable accessibilityRole="button" onPress={() => setShowDetails((v) => !v)} style={styles.detailsButton}><Text style={styles.detailsLabel}>文件详情</Text><Ionicons name={showDetails ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primary} /></Pressable>{showDetails ? <View style={styles.details}><Text selectable style={styles.detailText}>{savedMap.yaml_path}</Text><Text selectable style={styles.detailText}>{savedMap.pgm_path}</Text>{savedMap.output ? <Text selectable style={styles.detailText}>{savedMap.output}</Text> : null}</View> : null}</View> : null}
        </SectionCard>

        <SectionCard title="高级状态">
          <View style={styles.statusGrid}>
            <StatusCard title="基础驱动" value={processStateText(systemStatus?.bringup?.running)} technicalLabel="bringup" />
            <StatusCard title="建图服务" value={mappingStateText(mappingStatus?.mappingStatus)} technicalLabel="mapping" />
            <StatusCard title="建图引擎" value={booleanStateText(debugStatus?.nodes?.slam_toolbox)} technicalLabel="slam_toolbox" />
            <StatusCard title="地图数据" value={booleanStateText(debugStatus?.topics?.['/map'])} technicalLabel="/map" />
          </View>
        </SectionCard>
        <View style={styles.footerSpacer} />
      </ScrollView>
      <View style={styles.fixedControl}><Text style={styles.fixedTitle}>建图点动控制</Text><ControlPad mode="mapping" compact /></View>
    </View>
  );
}

function Step({ number, title, state, done, active = false }: { number: string; title: string; state: string; done: boolean; active?: boolean }) {
  return <View style={styles.step}><View style={[styles.stepDot, done && styles.stepDone, active && styles.stepActive]}><Text style={[styles.stepNumber, (done || active) && styles.stepNumberActive]}>{done ? '✓' : number}</Text></View><View><Text style={styles.stepTitle}>{title}</Text><Text style={styles.stepState}>{state}</Text></View></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg }, content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 16, paddingBottom: 16, gap: 16 }, title: { color: colors.text, fontSize: 28, fontWeight: '700' }, subtitle: { color: colors.textMuted, marginTop: 4 }, source: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  mapBox: { borderRadius: radius.sm, overflow: 'hidden', backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border }, mapImage: { width: '100%', height: '100%' }, emptyMap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 }, emptyTitle: { color: colors.text, fontSize: 17, fontWeight: '700' }, emptyText: { color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  steps: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 }, step: { flex: 1, minWidth: 110, flexDirection: 'row', gap: 9, alignItems: 'center' }, stepDot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.neutralSoft }, stepDone: { backgroundColor: colors.success }, stepActive: { backgroundColor: colors.primary }, stepNumber: { color: colors.textMuted, fontWeight: '700' }, stepNumberActive: { color: '#FFFFFF' }, stepTitle: { color: colors.text, fontWeight: '700' }, stepState: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, action: { flex: 1, minWidth: 140 }, inputBox: { gap: 7 }, label: { color: colors.text, fontWeight: '600' }, input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 12, backgroundColor: colors.input, color: colors.text }, inputInvalid: { borderColor: colors.warning },
  saved: { gap: 8, padding: 12, borderRadius: radius.sm, backgroundColor: colors.successSoft }, savedTitle: { color: '#166534', fontWeight: '700' }, detailsButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, detailsLabel: { color: colors.primary, fontWeight: '600' }, details: { gap: 6 }, detailText: { color: colors.textMuted, fontSize: 12 }, statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, footerSpacer: { height: 330 },
  fixedControl: { maxHeight: 330, padding: 12, gap: 8, borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.panel }, fixedTitle: { color: colors.text, fontWeight: '700' },
});
