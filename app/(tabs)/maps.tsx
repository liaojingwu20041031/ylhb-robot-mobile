import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { DebugMapFile } from '@/api/types';
import { AppButton } from '@/components/AppButton';
import { HelpText } from '@/components/HelpText';
import { PageContainer } from '@/components/PageContainer';
import { SectionCard } from '@/components/SectionCard';
import { StatusBadge } from '@/components/StatusBadge';
import { robotActions, useRobotStore } from '@/store/robotStore';
import { colors, radius } from '@/theme/consoleTheme';

const validName = (name: string) => /^[A-Za-z0-9_-]+$/.test(name.trim()) && !name.includes('..') && !name.includes('/') && !name.includes('\\') && !/\.(yaml|pgm)$/i.test(name);
const fileName = (path?: string | null) => path?.split(/[\\/]/).pop() || '未知';
const formatBytes = (size?: number | null) => !Number.isFinite(size ?? NaN) ? '未知' : (size ?? 0) < 1048576 ? `${Math.max(1, Math.round((size ?? 0) / 1024))} KB` : `${((size ?? 0) / 1048576).toFixed(1)} MB`;
const formatTime = (time?: number | null) => !time ? '未知' : new Date(time * 1000).toLocaleString();
const formatOrigin = (origin?: number[] | null) => origin?.length ? `[${origin.slice(0, 3).map((v) => Number(v).toFixed(3)).join(', ')}]` : '未知';

export default function MapsPage() {
  const { maps, pending, lastError, preview, previewName, previewError } = useRobotStore((s) => ({ maps: s.debugMaps, pending: s.pending, lastError: s.lastMapManageError, preview: s.debugMapPreview, previewName: s.debugMapPreviewName, previewError: s.lastMapPreviewError }));
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [detailsName, setDetailsName] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<DebugMapFile | null>(null);
  const [draftName, setDraftName] = useState('');

  useEffect(() => { robotActions.refreshDebugMaps(); }, []);
  useEffect(() => {
    if (!maps.length) { setSelectedName(null); return; }
    if (selectedName && maps.some((map) => map.name === selectedName)) return;
    const next = maps.find((map) => map.is_default) ?? maps[0];
    setSelectedName(next.name); robotActions.refreshDebugMapPreview(next.name);
  }, [maps, selectedName]);

  const selected = useMemo(() => maps.find((map) => map.name === selectedName) ?? null, [maps, selectedName]);
  const previewUri = preview && previewName === selectedName ? `data:image/png;base64,${preview.png_base64}` : undefined;
  const operationPending = pending.mapRenamePending || pending.mapDeletePending || pending.mapConfirmDefaultPending;

  const choose = (map: DebugMapFile) => { setSelectedName(map.name); robotActions.refreshDebugMapPreview(map.name); };
  const openRename = (map: DebugMapFile) => { setRenameTarget(map); setDraftName(map.name); };
  const closeRename = () => { setRenameTarget(null); setDraftName(''); };
  const submitRename = async () => { if (!renameTarget || !validName(draftName)) return; const result = await robotActions.renameDebugMap(renameTarget.name, draftName.trim()); if (result.ok) closeRename(); };
  const remove = (map: DebugMapFile) => Alert.alert('删除地图', `确认删除地图“${map.name}”？此操作会删除对应地图配置和图像文件。`, [{ text: '取消', style: 'cancel' }, { text: '确认删除', style: 'destructive', onPress: () => robotActions.deleteDebugMap(map.name) }]);
  const makeDefault = (map: DebugMapFile) => Alert.alert('设为默认地图', `确认将“${map.name}”设为默认地图？旧默认地图和旧巡逻路线将废弃。`, [{ text: '取消', style: 'cancel' }, { text: '确认', onPress: async () => { const result = await robotActions.confirmDefaultDebugMap(map.name); if (!result.ok) return; if (result.data?.changed === false) Alert.alert('默认地图', '该地图已经是默认地图'); else if ((result.data?.archived_routes ?? []).length) Alert.alert('默认地图已更新', '旧路线已废弃，需要重新创建巡逻路线。'); else Alert.alert('默认地图已更新', '新默认地图已生效。'); } }]);

  return (
    <PageContainer title="地图管理" subtitle="预览、选择和管理机器人地图">
      <SectionCard title="当前地图" actions={<AppButton label="刷新地图列表" variant="secondary" loading={pending.mapsPending} onPress={() => robotActions.refreshDebugMaps(true)} />}>
        {lastError ? <HelpText tone="danger">{lastError}</HelpText> : null}
        {selected ? <View style={styles.preview}>
          <View style={styles.previewHeader}><View><Text style={styles.previewName}>{selected.name}</Text><Text style={styles.previewMeta}>{selected.is_default ? '当前默认地图' : '已选中地图'}</Text></View>{selected.is_default ? <StatusBadge label="当前默认" tone="info" /> : null}</View>
          {pending.mapPreviewPending ? <HelpText tone="neutral">正在加载预览…</HelpText> : previewUri ? <Image source={{ uri: previewUri }} resizeMode="contain" style={styles.previewImage} /> : <HelpText tone={previewError ? 'danger' : 'neutral'}>{previewError ?? '暂无可用预览'}</HelpText>}
        </View> : <HelpText tone="neutral">暂无地图文件</HelpText>}
      </SectionCard>

      <SectionCard title="地图文件" description="默认地图受保护，不能重命名或删除。">
        <View style={styles.list}>{maps.map((map) => {
          const isDefault = map.is_default === true; const isValid = map.valid !== false; const expanded = detailsName === map.name;
          return <Pressable key={map.name} accessibilityRole="button" accessibilityLabel={`选择地图 ${map.name}`} onPress={() => choose(map)} style={({ pressed }) => [styles.card, selectedName === map.name && styles.cardSelected, pressed && styles.pressed]}>
            <View style={styles.cardHeader}><View style={styles.cardCopy}><Text selectable style={styles.mapName}>{map.name}</Text><View style={styles.badges}>{isDefault ? <StatusBadge label="当前默认" tone="info" /> : null}<StatusBadge label={isValid ? '有效' : '异常'} tone={isValid ? 'success' : 'danger'} /></View></View><Ionicons name="chevron-forward" size={20} color={colors.textSubtle} /></View>
            <View style={styles.summary}><Field label="修改时间" value={formatTime(map.modified_at)} /><Field label="文件大小" value={formatBytes(map.size_bytes)} /></View>
            {!isValid ? <HelpText tone="danger">地图文件异常，请检查文件完整性。</HelpText> : null}
            <Pressable accessibilityRole="button" onPress={() => setDetailsName(expanded ? null : map.name)} style={styles.detailsToggle}><Text style={styles.detailsLabel}>文件详情</Text><Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primary} /></Pressable>
            {expanded ? <View style={styles.details}><Field label="地图分辨率" value={map.resolution ?? '未知'} /><Field label="地图原点" value={formatOrigin(map.origin)} /><Field label="地图配置文件" value={fileName(map.yaml_file ?? map.yaml_path)} /><Field label="地图图像文件" value={fileName(map.pgm_file ?? map.pgm_path)} /></View> : null}
            <View style={styles.actions}>
              {!isDefault && isValid ? <AppButton label="设为默认" variant="warning" disabled={operationPending} loading={pending.mapConfirmDefaultPending && selectedName === map.name} onPress={() => makeDefault(map)} style={styles.action} /> : null}
              <AppButton label="重命名" variant="secondary" disabled={operationPending || isDefault || !isValid} onPress={() => openRename(map)} style={styles.action} />
              <AppButton label="删除" variant="danger" disabled={operationPending || isDefault} onPress={() => remove(map)} style={styles.action} />
            </View>
          </Pressable>;
        })}</View>
      </SectionCard>

      <Modal visible={renameTarget !== null} transparent animationType="fade" onRequestClose={closeRename}>
        <View style={styles.backdrop}><View style={styles.modal}><Text style={styles.modalTitle}>重命名地图</Text><Text style={styles.modalDescription}>当前地图：{renameTarget?.name}</Text><TextInput accessibilityLabel="新地图名称" style={styles.input} value={draftName} onChangeText={setDraftName} autoCapitalize="none" autoCorrect={false} placeholder="new_map_name" placeholderTextColor={colors.textSubtle} />{!validName(draftName) ? <HelpText tone="warning">地图文件名仅支持英文字母、数字、下划线和短横线。</HelpText> : null}<View style={styles.actions}><AppButton label="取消" variant="ghost" onPress={closeRename} style={styles.action} /><AppButton label="确认" loading={pending.mapRenamePending} disabled={!validName(draftName)} onPress={submitRename} style={styles.action} /></View></View></View>
      </Modal>
    </PageContainer>
  );
}

function Field({ label, value }: { label: string; value: string | number }) { return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><Text selectable style={styles.fieldValue}>{value}</Text></View>; }

const styles = StyleSheet.create({
  preview: { gap: 12 }, previewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }, previewName: { color: colors.text, fontSize: 18, fontWeight: '700' }, previewMeta: { color: colors.textMuted, fontSize: 12, marginTop: 3 }, previewImage: { width: '100%', height: 330, borderRadius: radius.sm, backgroundColor: colors.bg },
  list: { gap: 12 }, card: { padding: 14, gap: 12, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.panel }, cardSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft }, pressed: { opacity: 0.86 }, cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 }, cardCopy: { flex: 1, gap: 7 }, mapName: { color: colors.text, fontSize: 17, fontWeight: '700' }, badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  summary: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, details: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, field: { flex: 1, minWidth: 135, gap: 3, padding: 10, borderRadius: radius.sm, backgroundColor: colors.panelSoft }, fieldLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600' }, fieldValue: { color: colors.text, fontSize: 13 }, detailsToggle: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, detailsLabel: { color: colors.primary, fontWeight: '600' }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, action: { flex: 1, minWidth: 112 },
  backdrop: { flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.35)' }, modal: { width: '100%', maxWidth: 480, padding: 18, gap: 12, borderRadius: radius.lg, backgroundColor: colors.panel }, modalTitle: { color: colors.text, fontSize: 20, fontWeight: '700' }, modalDescription: { color: colors.textMuted }, input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 12, color: colors.text, backgroundColor: colors.input },
});
