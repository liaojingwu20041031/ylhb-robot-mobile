import * as Clipboard from 'expo-clipboard';
import { useSyncExternalStore } from 'react';
import { createRobotApi, MapSocket, StatusSocket } from '../api/robotApi';
import { trimBaseUrl } from '../api/http';
import {
  ApiResponse,
  AppLog,
  AppLogType,
  ConfirmDefaultMapResult,
  ConnectionTestResult,
  DebugMapFile,
  DebugMapPreview,
  DebugStatus,
  MapSnapshot,
  MappingSaveRequest,
  MappingStatus,
  MapSource,
  PendingState,
  RequestDiagnostics,
  RobotStatus,
  SavedMap,
  StatusSource,
  SystemStatus,
  VelocityCommand,
} from '../api/types';
import { buildStatusReport, formatLogs } from '../utils/status';

type StoreState = {
  baseUrl: string;
  connectionState: RobotStatus['connectionState'];
  refreshIntervalMs: number;
  statusSource: StatusSource;
  status: RobotStatus;
  debugStatus?: DebugStatus;
  systemStatus?: SystemStatus;
  mappingStatus?: MappingStatus;
  mapSnapshot?: MapSnapshot;
  savedMap?: SavedMap;
  debugMaps: DebugMapFile[];
  debugMapPreview?: DebugMapPreview;
  debugMapPreviewName?: string;
  debugMapsLastLoadedAt?: number;
  lastMapManageError?: string;
  lastMapPreviewError?: string;
  mapSource: MapSource;
  mapStreamConnected: boolean;
  lastMapFrameAt?: number;
  lastMapError?: string;
  linearSpeed: number;
  angularSpeed: number;
  commandDurationMs: number;
  logs: AppLog[];
  pending: PendingState;
  httpTest?: ConnectionTestResult;
  websocketTest?: ConnectionTestResult;
};

const DEFAULT_BASE_URL = 'http://192.168.137.100:8000';
const startupLog: AppLog = {
  id: 'startup',
  type: 'info',
  message: 'App 已启动',
  source: 'APP',
  timestamp: Date.now(),
};

const initialStatus: RobotStatus = {
  online: false,
  connectionState: 'disconnected',
  timestamp: Date.now(),
};

const initialPending: PendingState = {
  connectPending: false,
  statusPending: false,
  controlPending: false,
  systemPending: false,
  mappingStatusPending: false,
  mapSnapshotPending: false,
  mapSavePending: false,
  mapsPending: false,
  mapPreviewPending: false,
  mapConfirmDefaultPending: false,
  mapRenamePending: false,
  mapDeletePending: false,
  copyPending: false,
};

let state: StoreState = {
  baseUrl: DEFAULT_BASE_URL,
  connectionState: 'disconnected',
  refreshIntervalMs: 1000,
  statusSource: '未知',
  status: initialStatus,
  debugMaps: [],
  mapSource: 'none',
  mapStreamConnected: false,
  linearSpeed: 0.3,
  angularSpeed: 0.55,
  commandDurationMs: 500,
  logs: [startupLog],
  pending: initialPending,
};

let socket: StatusSocket | null = null;
let mapSocket: MapSocket | null = null;
let statusReconnectTimer: ReturnType<typeof setTimeout> | null = null;
let statusReconnectAttempt = 0;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function setState(patch: Partial<StoreState>) {
  state = { ...state, ...patch };
  emit();
}

function setPending(key: keyof PendingState, value: boolean) {
  setState({ pending: { ...state.pending, [key]: value } });
}

function addLog(type: AppLogType, message: string, detail?: string, source = 'APP') {
  const log: AppLog = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    message,
    detail,
    source,
    timestamp: Date.now(),
  };
  setState({ logs: [log, ...state.logs].slice(0, 500) });
}

function api() {
  return createRobotApi(state.baseUrl);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function formatDiagnostics(diagnostics?: RequestDiagnostics) {
  if (!diagnostics) {
    return ['请求诊断:', '诊断对象缺失'].join('\n');
  }
  const lines = [
    '请求诊断:',
    `method: ${diagnostics.method}`,
    `url: ${diagnostics.url}`,
    `baseUrl: ${diagnostics.baseUrl}`,
    `path: ${diagnostics.path}`,
    `scheme: ${diagnostics.scheme ?? '未知'}`,
    `host: ${diagnostics.host ?? '未知'}`,
    `port: ${diagnostics.port || '默认'}`,
    `durationMs: ${diagnostics.durationMs}`,
    `platform: ${diagnostics.platform}`,
    `status: ${diagnostics.status ?? '无 HTTP 响应'}`,
  ];
  if (diagnostics.errorName) {
    lines.push(`errorName: ${diagnostics.errorName}`);
  }
  if (diagnostics.errorMessage) {
    lines.push(`errorMessage: ${diagnostics.errorMessage}`);
  }
  if (diagnostics.suggestions?.length) {
    lines.push('排查建议:');
    diagnostics.suggestions.forEach((item) => lines.push(`- ${item}`));
  }
  return lines.join('\n');
}

function responseDetail(response: ApiResponse<unknown>) {
  const diagnostics = formatDiagnostics(response.diagnostics);
  return [response.error, diagnostics].filter(Boolean).join('\n\n') || undefined;
}

function mapManageError(response: ApiResponse<unknown>) {
  switch (response.error) {
    case 'map_in_use':
    case 'http_409':
      return '请先停止建图/导航';
    case 'map_exists':
      return '目标地图名称已存在';
    case 'default_map_protected':
      return '默认地图受保护，不能删除或重命名';
    case 'map_not_found':
      return '地图不存在，请刷新列表';
    case 'invalid_map_pair':
      return '地图文件不完整，不能重命名';
    case 'validation_error':
    case 'invalid_map_name':
      return '地图名称格式非法';
    default:
      return response.message ?? response.error ?? '地图操作失败';
  }
}

function reportMapManageError(label: string, response: ApiResponse<unknown>) {
  const message = mapManageError(response);
  setState({ lastMapManageError: message });
  addLog('error', `${label}: ${message}`, responseDetail(response), '地图管理');
}

function applyResponse<T>(label: string, response: ApiResponse<T>, logSuccess = true) {
  if (response.ok) {
    if (logSuccess) {
      addLog('api', `${label}: ${response.message ?? 'ok'}`, responseDetail(response), 'Bridge');
    }
  } else {
    addLog('error', `${label}: ${response.message ?? response.error ?? 'failed'}`, responseDetail(response), 'Bridge');
  }
}

async function run<T>(
  label: string,
  action: () => Promise<ApiResponse<T>>,
  pendingKey?: keyof PendingState,
  logSuccess = true,
) {
  if (pendingKey) {
    setPending(pendingKey, true);
  }
  try {
    const response = await action();
    applyResponse(label, response, logSuccess);
    return response;
  } finally {
    if (pendingKey) {
      setPending(pendingKey, false);
    }
  }
}

function updateConnection(connectionState: RobotStatus['connectionState'], online = connectionState === 'connected') {
  setState({
    connectionState,
    status: { ...state.status, connectionState, online },
  });
}

function openStatusSocket() {
  if (socket) {
    return;
  }
  if (statusReconnectTimer) {
    clearTimeout(statusReconnectTimer);
    statusReconnectTimer = null;
  }
  socket = api().connectStatusWebSocket(
    (status) => {
      statusReconnectAttempt = 0;
      setState({
        connectionState: 'connected',
        statusSource: 'WebSocket',
        status: { ...status, connectionState: 'connected', online: true },
      });
    },
    (message) => {
      addLog('warn', `${message}，状态来源降级为 HTTP fallback`, undefined, 'WebSocket');
      setState({ statusSource: 'HTTP fallback' });
      socket = null;
      if (statusReconnectAttempt < 3) {
        const delays = [1000, 2000, 5000];
        const delay = delays[statusReconnectAttempt] ?? 5000;
        statusReconnectAttempt += 1;
        statusReconnectTimer = setTimeout(() => openStatusSocket(), delay);
      }
    },
  );
  addLog('info', '已尝试打开 /ws/status 状态流', undefined, 'WebSocket');
}

function closeMapSocket() {
  mapSocket?.close();
  mapSocket = null;
  setState({ mapStreamConnected: false });
}

async function refreshAllForConnection() {
  const [status, debugStatus, systemStatus, mappingStatus] = await Promise.all([
    api().getStatus(),
    api().getDebugStatus(),
    api().getSystemStatus(),
    api().getMappingStatus(),
  ]);
  applyResponse('GET /api/status', status);
  applyResponse('GET /api/debug/status', debugStatus);
  applyResponse('GET /api/debug/system/status', systemStatus);
  applyResponse('GET /api/debug/mapping/status', mappingStatus);
  if (status.ok && status.data) {
    setState({ status: { ...status.data, connectionState: 'connected', online: true } });
  }
  if (debugStatus.ok && debugStatus.data) setState({ debugStatus: debugStatus.data });
  if (systemStatus.ok && systemStatus.data) setState({ systemStatus: systemStatus.data });
  if (mappingStatus.ok && mappingStatus.data) setState({ mappingStatus: mappingStatus.data });
  return status.ok && debugStatus.ok && systemStatus.ok && mappingStatus.ok;
}

export const robotActions = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot() {
    return state;
  },
  addLog,
  clearLogs() {
    setState({ logs: [] });
    addLog('info', '日志已清空', undefined, '日志');
  },
  saveSettings(baseUrl: string, refreshIntervalMs = state.refreshIntervalMs) {
    robotActions.stopStatusSocket(false);
    closeMapSocket();
    const normalizedBaseUrl = trimBaseUrl(baseUrl);
    setState({
      baseUrl: normalizedBaseUrl,
      refreshIntervalMs,
      statusSource: '未知',
      mapSource: 'none',
      httpTest: undefined,
      websocketTest: undefined,
    });
    addLog(
      'info',
      `Jetson Base URL 已保存：${normalizedBaseUrl}`,
      undefined,
      '设置',
    );
  },
  async saveSettingsAndConnect(baseUrl: string, refreshIntervalMs = state.refreshIntervalMs) {
    robotActions.saveSettings(baseUrl, refreshIntervalMs);
    return robotActions.connectRobot();
  },
  restoreDefaults() {
    robotActions.stopStatusSocket(false);
    closeMapSocket();
    setState({
      baseUrl: DEFAULT_BASE_URL,
      refreshIntervalMs: 1000,
      statusSource: '未知',
      mapSource: 'none',
      httpTest: undefined,
      websocketTest: undefined,
    });
    addLog('user', '已恢复默认 Jetson 地址和刷新间隔', undefined, '设置');
  },
  async connectRobot() {
    setPending('connectPending', true);
    updateConnection('connecting', false);
    addLog(
      'debug',
      `准备连接 Bridge：${trimBaseUrl(state.baseUrl)}`,
      undefined,
      '诊断',
    );
    try {
      const ok = await refreshAllForConnection();
      if (ok) {
        setState({ connectionState: 'connected', statusSource: 'HTTP fallback' });
        updateConnection('connected', true);
        openStatusSocket();
        return { ok: true, message: '机器人连接成功', timestamp: Date.now() } as ConnectionTestResult;
      }
      updateConnection('error', false);
      setState({ statusSource: 'HTTP fallback' });
      return { ok: false, message: '连接失败：至少一个状态接口返回失败', timestamp: Date.now() } as ConnectionTestResult;
    } finally {
      setPending('connectPending', false);
    }
  },
  startStatusSocket() {
    openStatusSocket();
  },
  stopStatusSocket(log = true) {
    if (statusReconnectTimer) {
      clearTimeout(statusReconnectTimer);
      statusReconnectTimer = null;
    }
    statusReconnectAttempt = 0;
    socket?.close();
    socket = null;
    if (log) {
      addLog('info', 'WebSocket 状态流已关闭', undefined, 'WebSocket');
    }
  },
  async refreshStatus(logSuccess = false) {
    const response = await run('GET /api/status', () => api().getStatus(), logSuccess ? 'statusPending' : undefined, logSuccess);
    if (response.ok && response.data) {
      setState({
        connectionState: 'connected',
        statusSource: state.statusSource === 'WebSocket' ? 'WebSocket' : 'HTTP fallback',
        status: { ...response.data, connectionState: 'connected', online: true },
      });
    } else {
      updateConnection('error', false);
      setState({ statusSource: 'HTTP fallback' });
    }
    return response;
  },
  async refreshDebugStatus(logSuccess = false) {
    const response = await run('GET /api/debug/status', () => api().getDebugStatus(), logSuccess ? 'statusPending' : undefined, logSuccess);
    if (response.ok && response.data) {
      setState({ debugStatus: response.data });
    }
    return response;
  },
  async refreshSystemStatus(logSuccess = false) {
    const response = await run('GET /api/debug/system/status', () => api().getSystemStatus(), logSuccess ? 'systemPending' : undefined, logSuccess);
    if (response.ok && response.data) {
      setState({ systemStatus: response.data });
    }
    return response;
  },
  async refreshMappingStatus(logSuccess = false) {
    const response = await run('GET /api/debug/mapping/status', () => api().getMappingStatus(), logSuccess ? 'mappingStatusPending' : undefined, logSuccess);
    if (response.ok && response.data) {
      setState({ mappingStatus: response.data });
    }
    return response;
  },
  async refreshStatusBundle(logSuccess = false) {
    await Promise.all([
      robotActions.refreshStatus(logSuccess),
      robotActions.refreshDebugStatus(logSuccess),
      robotActions.refreshSystemStatus(logSuccess),
      robotActions.refreshMappingStatus(logSuccess),
    ]);
  },
  async testHttpConnection() {
    const started = Date.now();
    addLog('debug', `测试 HTTP 连接：${trimBaseUrl(state.baseUrl)}/api/status`, undefined, '诊断');
    const response = await robotActions.refreshStatus(true);
    const result: ConnectionTestResult = {
      ok: response.ok,
      message: response.ok ? '/api/status 正常' : response.message ?? response.error ?? '/api/status 失败',
      latencyMs: Date.now() - started,
      timestamp: Date.now(),
    };
    setState({ httpTest: result });
    if (response.ok) {
      addLog(
        'api',
        `测试 HTTP 连接成功：${response.diagnostics?.url ?? `${trimBaseUrl(state.baseUrl)}/api/status`}`,
        formatDiagnostics(response.diagnostics),
        'Bridge',
      );
    }
    return result;
  },
  async testWebSocket() {
    const started = Date.now();
    try {
      openStatusSocket();
      const result = { ok: true, message: '已尝试连接 /ws/status，请观察状态来源', latencyMs: Date.now() - started, timestamp: Date.now() };
      setState({ websocketTest: result });
      return result;
    } catch (error) {
      const result = { ok: false, message: error instanceof Error ? error.message : String(error), latencyMs: Date.now() - started, timestamp: Date.now() };
      setState({ websocketTest: result });
      addLog('error', result.message, undefined, 'WebSocket');
      return result;
    }
  },
  setLinearSpeed(value: number) {
    setState({ linearSpeed: clamp(value, 0.01, 0.35) });
  },
  setAngularSpeed(value: number) {
    setState({ angularSpeed: clamp(value, 0.05, 0.55) });
  },
  setCommandDurationMs(value: number) {
    setState({ commandDurationMs: clamp(Math.round(value), 50, 3000) });
  },
  async sendVelocity(command: VelocityCommand, quiet = false) {
    return run('POST /api/cmd_vel', () => api().sendVelocity(command), quiet ? undefined : 'controlPending', !quiet);
  },
  async chassisStop() {
    return run('POST /api/debug/chassis/stop', () => api().chassisStop(), 'controlPending');
  },
  async emergencyStop(quiet = false) {
    return run('POST /api/stop', () => api().emergencyStop(), quiet ? undefined : 'controlPending', !quiet);
  },
  async startBringup() {
    const response = await run('POST /api/debug/system/start/bringup', () => api().startBringup(), 'systemPending');
    await robotActions.refreshSystemStatus();
    await robotActions.refreshDebugStatus();
    await robotActions.refreshMappingStatus();
    return response;
  },
  async stopBringup() {
    if (state.systemStatus?.mapping?.running) {
      addLog('warn', '停止 bringup 前先停止 mapping 进程', undefined, '系统进程');
      await robotActions.stopMapping();
    }
    const response = await run('POST /api/debug/system/stop/bringup', () => api().stopBringup(), 'systemPending');
    await robotActions.refreshSystemStatus();
    await robotActions.refreshDebugStatus();
    await robotActions.refreshMappingStatus();
    return response;
  },
  async startMapping() {
    closeMapSocket();
    setState({ mapSnapshot: undefined, savedMap: undefined, mapSource: 'none', lastMapError: undefined });
    const response = await run('POST /api/debug/system/start/mapping', () => api().startMapping(), 'mappingStatusPending');
    await robotActions.refreshSystemStatus();
    await robotActions.refreshMappingStatus();
    return response;
  },
  async stopMapping() {
    const response = await run('POST /api/debug/system/stop/mapping', () => api().stopMapping(), 'mappingStatusPending');
    closeMapSocket();
    setState({ mapSnapshot: undefined, savedMap: undefined, mapSource: 'none', lastMapError: undefined });
    await robotActions.refreshSystemStatus();
    await robotActions.refreshMappingStatus();
    return response;
  },
  async refreshMapSnapshot(downsample = 1, logSuccess = false) {
    const response = await run(
      `GET /api/debug/mapping/map_snapshot?downsample=${downsample}`,
      () => api().getMapSnapshot(downsample),
      logSuccess ? 'mapSnapshotPending' : undefined,
      logSuccess,
    );
    if (response.ok && response.data) {
      setState({ mapSnapshot: response.data, mapSource: 'http', lastMapFrameAt: Date.now(), lastMapError: undefined });
    } else if (response.error === 'no_map') {
      setState({ mapSnapshot: undefined, mapSource: state.mapStreamConnected ? 'ws' : 'none', lastMapError: response.message ?? response.error });
    }
    return response;
  },
  startMapStream(downsample = 1) {
    if (mapSocket) {
      return;
    }
    mapSocket = api().connectMapWebSocket(
      downsample,
      (snapshot) => {
        setState({
          mapSnapshot: snapshot,
          mapSource: 'ws',
          mapStreamConnected: true,
          lastMapFrameAt: Date.now(),
          lastMapError: undefined,
        });
      },
      (message, error) => {
        setState({
          mapStreamConnected: true,
          lastMapError: error ? `${message} (${error})` : message,
        });
      },
      () => {
        mapSocket = null;
        setState({ mapStreamConnected: false, mapSource: state.mapSnapshot ? 'http' : 'none' });
      },
    );
    setState({ mapStreamConnected: true });
    addLog('info', '已连接 /ws/map?downsample=1 地图流', undefined, 'WebSocket');
  },
  stopMapStream() {
    closeMapSocket();
  },
  async saveMapping(body: MappingSaveRequest) {
    const response = await run('POST /api/debug/mapping/save', () => api().saveMapping(body), 'mapSavePending');
    if (response.ok && response.data) {
      setState({ savedMap: response.data });
    }
    return response;
  },
  async refreshDebugMaps(logSuccess = false) {
    const response = await run('GET /api/debug/maps', () => api().getDebugMaps(), 'mapsPending', logSuccess);
    if (response.ok && response.data) {
      setState({
        debugMaps: response.data.maps ?? [],
        debugMapsLastLoadedAt: Date.now(),
        lastMapManageError: undefined,
      });
    } else {
      reportMapManageError('刷新地图列表失败', response);
    }
    return response;
  },
  async refreshDebugMapPreview(mapName: string, maxSizePx = 1024, logSuccess = false) {
    const response = await run(
      `GET /api/debug/maps/${mapName}/preview?max_size_px=${maxSizePx}`,
      () => api().getDebugMapPreview(mapName, maxSizePx),
      'mapPreviewPending',
      logSuccess,
    );
    if (response.ok && response.data) {
      setState({
        debugMapPreview: response.data,
        debugMapPreviewName: mapName,
        lastMapPreviewError: undefined,
      });
    } else {
      const message = mapManageError(response);
      setState({
        debugMapPreview: undefined,
        debugMapPreviewName: mapName,
        lastMapPreviewError: message,
      });
      addLog('error', `加载地图预览失败: ${message}`, responseDetail(response), '地图管理');
    }
    return response;
  },
  async confirmDefaultDebugMap(mapName: string) {
    const response = await run<ConfirmDefaultMapResult>(
      `POST /api/debug/maps/${mapName}/confirm_default`,
      () => api().confirmDefaultDebugMap(mapName),
      'mapConfirmDefaultPending',
    );
    if (response.ok) {
      setState({ lastMapManageError: undefined });
      await robotActions.refreshDebugMaps();
      const nextDefault = response.data?.default ?? mapName;
      await robotActions.refreshDebugMapPreview(nextDefault);
    } else {
      reportMapManageError('设置默认地图失败', response);
    }
    return response;
  },
  async renameDebugMap(mapName: string, newName: string) {
    const response = await run(
      `POST /api/debug/maps/${mapName}/rename`,
      () => api().renameDebugMap(mapName, { new_name: newName }),
      'mapRenamePending',
    );
    if (response.ok) {
      setState({ lastMapManageError: undefined });
      await robotActions.refreshDebugMaps();
    } else {
      reportMapManageError('重命名地图失败', response);
    }
    return response;
  },
  async deleteDebugMap(mapName: string) {
    const response = await run(
      `DELETE /api/debug/maps/${mapName}`,
      () => api().deleteDebugMap(mapName),
      'mapDeletePending',
    );
    if (response.ok) {
      setState({ lastMapManageError: undefined });
      await robotActions.refreshDebugMaps();
    } else {
      reportMapManageError('删除地图失败', response);
    }
    return response;
  },
  async copyText(label: string, text: string) {
    setPending('copyPending', true);
    try {
      await Clipboard.setStringAsync(text);
      addLog('user', `${label}已复制为纯文本`, undefined, '复制');
    } catch (error) {
      addLog('error', `${label}复制失败`, error instanceof Error ? error.message : String(error), '复制');
    } finally {
      setPending('copyPending', false);
    }
  },
  async copyStatusReport() {
    return robotActions.copyText(
      '状态报告',
      buildStatusReport(state.status, state.debugStatus, state.systemStatus, state.mappingStatus, state.statusSource),
    );
  },
  async copyLogs(mode: 'all' | 'errors' | 'recent50') {
    const logs =
      mode === 'errors'
        ? state.logs.filter((log) => log.type === 'error')
        : mode === 'recent50'
          ? state.logs.slice(0, 50)
          : state.logs;
    return robotActions.copyText('日志', formatLogs(logs));
  },
};

export function useRobotStore<T>(selector: (snapshot: StoreState) => T): T {
  const snapshot = useSyncExternalStore(
    robotActions.subscribe,
    robotActions.getSnapshot,
    robotActions.getSnapshot,
  );
  return selector(snapshot);
}
