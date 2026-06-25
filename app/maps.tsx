import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppButton } from '../src/components/AppButton';
import { HelpText } from '../src/components/HelpText';
import { PageContainer } from '../src/components/PageContainer';
import { SectionCard } from '../src/components/SectionCard';
import { StatusBadge } from '../src/components/StatusBadge';
import { DebugMapFile } from '../src/api/types';
import { robotActions, useRobotStore } from '../src/store/robotStore';
import { colors, radius } from '../src/theme/consoleTheme';

function formatBytes(sizeBytes?: number | null) {
  if (!Number.isFinite(sizeBytes ?? NaN) || (sizeBytes ?? 0) < 0) {
    return '未知';
  }
  const size = sizeBytes ?? 0;
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function formatUnixTime(modifiedAt?: number | null) {
  if (!Number.isFinite(modifiedAt ?? NaN) || (modifiedAt ?? 0) <= 0) {
    return '未知';
  }
  return new Date((modifiedAt ?? 0) * 1000).toLocaleString();
}

function formatOrigin(origin?: number[] | null) {
  if (!Array.isArray(origin) || origin.length < 3) {
    return '未知';
  }
  return `[${origin.slice(0, 3).map((value) => Number(value).toFixed(3)).join(', ')}]`;
}

function translateMapIssue(issue: string) {
  const labels: Record<string, string> = {
    pgm_missing: 'PGM 文件缺失',
    yaml_missing: 'YAML 文件缺失',
    yaml_invalid: 'YAML 文件格式异常',
    pgm_invalid: 'PGM 文件格式异常',
    image_missing: '地图图像缺失',
    invalid_yaml: 'YAML 文件格式异常',
    invalid_pgm: 'PGM 文件格式异常',
  };
  return labels[issue] ?? issue;
}

function isValidMapName(name: string) {
  const trimmed = name.trim();
  return (
    trimmed.length > 0 &&
    /^[A-Za-z0-9_-]+$/.test(trimmed) &&
    !trimmed.includes('..') &&
    !trimmed.includes('/') &&
    !trimmed.includes('\\') &&
    !trimmed.toLowerCase().endsWith('.yaml') &&
    !trimmed.toLowerCase().endsWith('.pgm')
  );
}

function validationMessage(name: string) {
  if (!name.trim()) {
    return '请输入地图名称';
  }
  if (!isValidMapName(name)) {
    return '只能使用英文字母、数字、下划线和中划线，不能包含路径或 .yaml/.pgm 扩展名';
  }
  return '';
}

function fileName(path?: string | null) {
  if (!path) {
    return '未知';
  }
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1] || path;
}

function MapField({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue} selectable>
        {value}
      </Text>
    </View>
  );
}

function MapCard({
  map,
  selected,
  pending,
  confirmPending,
  onSelect,
  onRename,
  onDelete,
  onConfirmDefault,
}: {
  map: DebugMapFile;
  selected: boolean;
  pending: boolean;
  confirmPending: boolean;
  onSelect: (map: DebugMapFile) => void;
  onRename: (map: DebugMapFile) => void;
  onDelete: (map: DebugMapFile) => void;
  onConfirmDefault: (map: DebugMapFile) => void;
}) {
  const isDefault = map.is_default === true;
  const isValid = map.valid !== false;
  const issues = map.issues ?? [];
  const renameDisabled = pending || isDefault || !isValid;
  const deleteDisabled = pending || isDefault;
  const canConfirmDefault = isValid && !isDefault;

  return (
    <Pressable
      onPress={() => onSelect(map)}
      style={({ pressed }) => [
        styles.mapCard,
        selected && styles.mapCardSelected,
        pressed && styles.mapCardPressed,
      ]}
    >
      <View style={styles.mapHeader}>
        <View style={styles.mapTitleBox}>
          <Text style={styles.mapName} selectable>
            {map.name}
          </Text>
          <View style={styles.badges}>
            {isDefault ? <StatusBadge label="当前默认" tone="info" /> : null}
            {selected ? <StatusBadge label="已选中" tone="neutral" /> : null}
            <StatusBadge label={isValid ? '有效' : '文件异常'} tone={isValid ? 'success' : 'danger'} />
          </View>
        </View>
      </View>

      {isDefault ? <HelpText tone="info">默认导航地图受保护</HelpText> : null}
      {!isValid && issues.length > 0 ? (
        <HelpText tone="danger">{issues.map(translateMapIssue).join('、')}</HelpText>
      ) : null}

      <View style={styles.fields}>
        <MapField label="大小" value={formatBytes(map.size_bytes)} />
        <MapField label="修改时间" value={formatUnixTime(map.modified_at)} />
        <MapField label="Resolution" value={map.resolution ?? '未知'} />
        <MapField label="Origin" value={formatOrigin(map.origin)} />
        <MapField label="YAML" value={fileName(map.yaml_file ?? map.yaml_path)} />
        <MapField label="PGM" value={fileName(map.pgm_file ?? map.pgm_path)} />
      </View>

      <View style={styles.cardActions}>
        {canConfirmDefault ? (
          <AppButton
            label="设为默认"
            variant="warning"
            loading={confirmPending && selected}
            disabled={pending}
            onPress={() => onConfirmDefault(map)}
            style={styles.cardAction}
          />
        ) : null}
        <AppButton
          label="重命名"
          variant="secondary"
          disabled={renameDisabled}
          onPress={() => onRename(map)}
          style={styles.cardAction}
        />
        <AppButton
          label="删除"
          variant="danger"
          disabled={deleteDisabled}
          onPress={() => onDelete(map)}
          style={styles.cardAction}
        />
      </View>
    </Pressable>
  );
}

export default function MapsPage() {
  const { maps, pending, lastError, lastLoadedAt, preview, previewName, previewError } = useRobotStore((snapshot) => ({
    maps: snapshot.debugMaps,
    pending: snapshot.pending,
    lastError: snapshot.lastMapManageError,
    lastLoadedAt: snapshot.debugMapsLastLoadedAt,
    preview: snapshot.debugMapPreview,
    previewName: snapshot.debugMapPreviewName,
    previewError: snapshot.lastMapPreviewError,
  }));
  const [renameTarget, setRenameTarget] = useState<DebugMapFile | null>(null);
  const [draftName, setDraftName] = useState('');
  const [selectedMapName, setSelectedMapName] = useState<string | null>(null);

  useEffect(() => {
    robotActions.refreshDebugMaps();
  }, []);

  useEffect(() => {
    if (maps.length === 0) {
      setSelectedMapName(null);
      return;
    }
    const selectedStillExists = selectedMapName ? maps.some((map) => map.name === selectedMapName) : false;
    if (selectedStillExists) {
      return;
    }
    const nextMap = maps.find((map) => map.is_default === true) ?? maps[0];
    setSelectedMapName(nextMap.name);
    robotActions.refreshDebugMapPreview(nextMap.name);
  }, [maps, selectedMapName]);

  const renameError = useMemo(() => validationMessage(draftName), [draftName]);
  const selectedMap = useMemo(
    () => maps.find((map) => map.name === selectedMapName) ?? null,
    [maps, selectedMapName],
  );
  const operationPending = pending.mapRenamePending || pending.mapDeletePending || pending.mapConfirmDefaultPending;
  const previewUri =
    preview && previewName === selectedMapName ? `data:image/png;base64,${preview.png_base64}` : null;
  const previewAspectRatio =
    preview?.map_meta?.width && preview?.map_meta?.height
      ? Math.max(0.2, Math.min(5, preview.map_meta.width / preview.map_meta.height))
      : 1;

  const openRename = (map: DebugMapFile) => {
    setRenameTarget(map);
    setDraftName(map.name);
  };

  const closeRename = () => {
    setRenameTarget(null);
    setDraftName('');
  };

  const submitRename = async () => {
    if (!renameTarget || renameError) {
      return;
    }
    const response = await robotActions.renameDebugMap(renameTarget.name, draftName.trim());
    if (response.ok) {
      closeRename();
    }
  };

  const confirmDelete = (map: DebugMapFile) => {
    Alert.alert('删除地图', `确认删除地图“${map.name}”？此操作会删除对应 YAML/PGM 文件。`, [
      { text: '取消', style: 'cancel' },
      {
        text: '确认删除',
        style: 'destructive',
        onPress: () => robotActions.deleteDebugMap(map.name),
      },
    ]);
  };

  const selectMap = (map: DebugMapFile) => {
    setSelectedMapName(map.name);
    robotActions.refreshDebugMapPreview(map.name);
  };

  const confirmDefault = (map: DebugMapFile) => {
    Alert.alert(
      '设为默认地图',
      `确认后该地图会变成 my_map，旧默认地图会自动标记为废弃，旧巡逻路线也会废弃，需要基于新地图重新创建巡逻路线。\n\n地图：${map.name}`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认',
          onPress: async () => {
            const response = await robotActions.confirmDefaultDebugMap(map.name);
            if (!response.ok) {
              return;
            }
            if (response.data?.changed === false) {
              Alert.alert('默认地图', '该地图已经是默认地图');
              return;
            }
            if ((response.data?.archived_routes ?? []).length > 0) {
              Alert.alert('默认地图已更新', '旧路线已废弃，需要重新创建巡逻路线。');
              return;
            }
            Alert.alert('默认地图已更新', '新默认地图已生效。');
          },
        },
      ],
    );
  };

  return (
    <PageContainer title="地图管理" subtitle="查看、重命名、删除和确认 Jetson 上的调试地图文件。">
      <SectionCard
        title="地图文件"
        description="列表来自 /api/debug/maps，预览来自已保存地图接口。默认导航地图受保护，文件异常地图只能删除。"
        summary={
          lastLoadedAt ? (
            <StatusBadge label={`已加载 ${new Date(lastLoadedAt).toLocaleTimeString()}`} tone="info" />
          ) : (
            <StatusBadge label="未加载" tone="neutral" />
          )
        }
      >
        <View style={styles.actions}>
          <AppButton
            label="刷新"
            variant="secondary"
            loading={pending.mapsPending}
            onPress={() => robotActions.refreshDebugMaps(true)}
            style={styles.refreshButton}
          />
        </View>

        {lastError ? <HelpText tone="danger">{lastError}</HelpText> : null}
        {!pending.mapsPending && maps.length === 0 ? <HelpText tone="neutral">暂无地图文件</HelpText> : null}

        {selectedMap ? (
          <View style={styles.previewPanel}>
            <View style={styles.previewHeader}>
              <View style={styles.previewTitleBox}>
                <Text style={styles.previewTitle}>已保存地图预览</Text>
                <Text style={styles.previewSubtitle} selectable>
                  {selectedMap.name}
                </Text>
              </View>
              {selectedMap.is_default ? <StatusBadge label="当前默认" tone="info" /> : null}
            </View>
            {pending.mapPreviewPending ? (
              <HelpText tone="neutral">正在加载预览...</HelpText>
            ) : null}
            {previewError && previewName === selectedMapName ? <HelpText tone="danger">{previewError}</HelpText> : null}
            {previewUri ? (
              <Image
                source={{ uri: previewUri }}
                resizeMode="contain"
                style={[styles.previewImage, { aspectRatio: previewAspectRatio }]}
              />
            ) : !pending.mapPreviewPending ? (
              <HelpText tone="neutral">暂无可用预览</HelpText>
            ) : null}
          </View>
        ) : null}

        <View style={styles.list}>
          {maps.map((map) => (
            <MapCard
              key={map.name}
              map={map}
              selected={map.name === selectedMapName}
              pending={operationPending}
              confirmPending={pending.mapConfirmDefaultPending}
              onSelect={selectMap}
              onRename={openRename}
              onDelete={confirmDelete}
              onConfirmDefault={confirmDefault}
            />
          ))}
        </View>
      </SectionCard>

      <Modal visible={renameTarget !== null} transparent animationType="fade" onRequestClose={closeRename}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalPanel}>
            <Text style={styles.modalTitle}>重命名地图</Text>
            <Text style={styles.modalDescription}>当前地图：{renameTarget?.name}</Text>
            <TextInput
              style={styles.input}
              value={draftName}
              onChangeText={setDraftName}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="new_map_name"
              placeholderTextColor={colors.textSubtle}
            />
            {renameError ? <HelpText tone="warning">{renameError}</HelpText> : null}
            {lastError ? <HelpText tone="danger">{lastError}</HelpText> : null}
            <View style={styles.modalActions}>
              <AppButton label="取消" variant="ghost" onPress={closeRename} style={styles.modalAction} />
              <AppButton
                label="确认"
                loading={pending.mapRenamePending}
                disabled={Boolean(renameError)}
                onPress={submitRename}
                style={styles.modalAction}
              />
            </View>
          </View>
        </View>
      </Modal>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  refreshButton: {
    minWidth: 120,
  },
  list: {
    gap: 10,
  },
  mapCard: {
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
    gap: 10,
  },
  mapCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  mapCardPressed: {
    opacity: 0.88,
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  mapTitleBox: {
    flex: 1,
    gap: 8,
  },
  mapName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  fields: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  field: {
    minWidth: 132,
    flex: 1,
    padding: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
    gap: 3,
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
  },
  fieldValue: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cardAction: {
    flex: 1,
    minWidth: 120,
  },
  previewPanel: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
    padding: 12,
    gap: 10,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  previewTitleBox: {
    flex: 1,
    gap: 4,
  },
  previewTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  previewSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
  },
  previewImage: {
    width: '100%',
    minHeight: 220,
    maxHeight: 520,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.input,
  },
  modalBackdrop: {
    flex: 1,
    padding: 18,
    backgroundColor: 'rgba(36, 22, 11, 0.38)',
    justifyContent: 'center',
  },
  modalPanel: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.panel,
    padding: 14,
    gap: 10,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  modalDescription: {
    color: colors.textMuted,
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 12,
    backgroundColor: colors.input,
    color: colors.text,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 8,
  },
  modalAction: {
    flex: 1,
  },
});
