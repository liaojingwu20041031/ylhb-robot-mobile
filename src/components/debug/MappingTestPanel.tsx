import { useState } from 'react';
import { Image, StyleSheet, Text, TextInput, View } from 'react-native';
import { robotActions, useRobotStore } from '../../store/robotStore';
import { colors } from '../../theme/consoleTheme';
import { freshnessLabel, stateTone } from '../../utils/status';
import { AppButton } from '../AppButton';
import { HelpText } from '../HelpText';
import { SectionCard } from '../SectionCard';
import { StatusCard } from '../StatusCard';

const MAP_NAME_PATTERN = /^[A-Za-z0-9_-]+$/;

function nextActionLabel(value?: string) {
  switch (value) {
    case 'start_bringup':
      return '先启动底盘';
    case 'start_mapping':
      return '可以开始建图';
    case 'wait_for_map':
      return '等待 /map 数据';
    case 'continue_mapping_or_save':
      return '可继续建图或保存';
    default:
      return value ?? '未知';
  }
}

export function MappingTestPanel() {
  const [mapName, setMapName] = useState('my_map');
  const { mappingStatus, systemStatus, mapSnapshot, pending } = useRobotStore((snapshot) => ({
    mappingStatus: snapshot.mappingDebugStatus,
    systemStatus: snapshot.systemStatus,
    mapSnapshot: snapshot.mapSnapshot,
    pending: snapshot.pending,
  }));
  const process = mappingStatus?.process ?? systemStatus?.mapping;
  const mapNameValid = MAP_NAME_PATTERN.test(mapName);
  const imageUri = mapSnapshot?.png_base64 ? `data:image/png;base64,${mapSnapshot.png_base64}` : undefined;
  const waitingForMap = mappingStatus?.recommendedNextAction === 'wait_for_map' || mappingStatus?.mapAvailable === false;
  const saveDisabled = !mapNameValid || pending.mapping || !mappingStatus?.mapAvailable;

  return (
    <SectionCard title="建图调试" description="控制 mapping 进程，查看地图快照，并保存 map_saver 输出。">
      <HelpText tone="warning">启动建图前请确认底盘已就绪，移动时保持低速，必要时使用全局 STOP。</HelpText>
      <HelpText tone={waitingForMap ? 'warning' : 'info'}>{nextActionLabel(mappingStatus?.recommendedNextAction)}</HelpText>
      <View style={styles.grid}>
        <StatusCard title="bringup_ready" value={mappingStatus?.bringupReady} tone={stateTone(mappingStatus?.bringupReady)} />
        <StatusCard title="mapping" value={mappingStatus?.mappingStatus ?? process?.running} tone={stateTone(mappingStatus?.mappingStatus ?? process?.running)} />
        <StatusCard title="map_available" value={mappingStatus?.mapAvailable} tone={stateTone(mappingStatus?.mapAvailable)} />
        <StatusCard title="下一步" value={nextActionLabel(mappingStatus?.recommendedNextAction)} tone="info" />
        <StatusCard title="/map 新鲜度" value={freshnessLabel(mappingStatus?.lastMapAgeSec ?? undefined)} tone={mappingStatus?.lastMapAgeSec == null ? 'neutral' : stateTone(mappingStatus.lastMapAgeSec <= 3)} />
        <StatusCard title="进程 PID" value={process?.pid ?? '无'} tone={stateTone(process?.running)} />
      </View>

      <View style={styles.previewBox}>
        <View style={styles.previewHeader}>
          <Text style={styles.previewTitle}>地图预览</Text>
          <Text style={styles.previewMeta} selectable>
            {mapSnapshot?.map_meta ? `${mapSnapshot.map_meta.width} x ${mapSnapshot.map_meta.height} · ${mapSnapshot.map_meta.resolution}m` : '等待 /map 数据'}
          </Text>
        </View>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.mapImage} resizeMode="contain" />
        ) : (
          <View style={styles.emptyMap}>
            <Text style={styles.emptyText}>{waitingForMap ? '等待 /map 数据' : '暂无地图快照'}</Text>
          </View>
        )}
      </View>

      <View style={styles.saveRow}>
        <View style={styles.inputWrap}>
          <Text style={styles.inputLabel}>地图名称</Text>
          <TextInput
            value={mapName}
            onChangeText={setMapName}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="my_map"
            placeholderTextColor={colors.textSubtle}
            style={[styles.input, !mapNameValid && styles.inputError]}
          />
        </View>
        <AppButton
          label="保存地图"
          description="POST /api/debug/mapping/save"
          variant="warning"
          disabled={saveDisabled}
          loading={pending.mapping}
          onPress={() => robotActions.saveMapping({ map_name: mapName })}
          style={styles.saveButton}
        />
      </View>
      {!mapNameValid ? <HelpText tone="danger">地图名称只能包含英文字母、数字、下划线和短横线。</HelpText> : null}
      {pending.mapping ? <HelpText tone="info">请求处理中，请等待完成后再重复操作。</HelpText> : null}
      {!mappingStatus?.mapAvailable ? <HelpText tone="warning">无地图数据时不能保存；请启动 mapping 并等待 /map 发布。</HelpText> : null}

      <View style={styles.actions}>
        <AppButton label="刷新建图状态" loading={pending.mapping} onPress={() => robotActions.mappingStatus()} style={styles.actionButton} />
        <AppButton label="启动建图" variant="warning" loading={pending.mapping} onPress={() => robotActions.startMapping()} style={styles.actionButton} />
        <AppButton label="刷新地图快照" loading={pending.mapping} onPress={() => robotActions.refreshMapSnapshot(1)} style={styles.actionButton} />
        <AppButton label="停止建图" variant="secondary" loading={pending.mapping} onPress={() => robotActions.stopMapping()} style={styles.actionButton} />
      </View>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  previewBox: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    overflow: 'hidden',
  },
  previewHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  previewTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  previewMeta: {
    color: colors.textMuted,
    fontSize: 12,
  },
  mapImage: {
    width: '100%',
    height: 220,
    backgroundColor: colors.input,
  },
  emptyMap: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.input,
  },
  emptyText: {
    color: colors.textSubtle,
    fontWeight: '800',
  },
  saveRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'flex-end',
  },
  inputWrap: {
    flex: 2,
    minWidth: 180,
    gap: 6,
  },
  inputLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  input: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.input,
    color: colors.text,
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: '800',
  },
  inputError: {
    borderColor: colors.danger,
  },
  saveButton: {
    flex: 1,
    minWidth: 150,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    minWidth: 140,
  },
});
