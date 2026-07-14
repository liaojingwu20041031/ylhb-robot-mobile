import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { useSyncExternalStore } from 'react';
import { createRobotApi } from '../api/robotApi';
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
import {
  DEFAULT_CONNECTION_CONFIG,
  RobotConnectionController,
  type ConnectionPhase,
  type MapStreamPhase,
  type RobotConnectionConfig,
} from '../network/RobotConnectionController';
import { buildStatusReport, formatLogs } from '../utils/status';

type StoreState = {
  baseUrl: string;
  connectionConfig: RobotConnectionConfig;
  connectionPhase: ConnectionPhase;
  endpointSwitching: boolean;
  endpointSwitchMessage?: string;
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
  mapStreamState: MapStreamPhase;
  mapStreamConnected: boolean;
  lastMapFrameAt?: number;
  lastMapError?: string;
  linearSpeed: number;
  angularSpeed: number;
  commandDurationMs: number;
  logs: AppLog[];
  pending: PendingState;
  httpTest?: ConnectionTestResult;
};

const DEFAULT_CONFIG: RobotConnectionConfig = {
  ...DEFAULT_CONNECTION_CONFIG,
  primaryUrl: 'http://192.168.137.100:8000',
  fallbackUrl: 'http://192.168.8.20:8000',
};
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
  baseUrl: DEFAULT_CONFIG.primaryUrl,
  connectionConfig: DEFAULT_CONFIG,
  connectionPhase: 'idle',
  endpointSwitching: false,
  connectionState: 'disconnected',
  refreshIntervalMs: DEFAULT_CONFIG.refreshIntervalMs,
  statusSource: '未知',
  status: initialStatus,
  debugMaps: [],
  mapSource: 'none',
  mapStreamState: 'idle',
  mapStreamConnected: false,
  linearSpeed: 0.3,
  angularSpeed: 0.55,
  commandDurationMs: 500,
  logs: [startupLog],
  pending: initialPending,
};

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

const connectionController = new RobotConnectionController({
  probe: (url, signal) => createRobotApi(url).getStatus(2000, signal),
  getStatus: (url, signal) => createRobotApi(url).getStatus(3000, signal),
  emergencyStop: (url, signal) => createRobotApi(url).emergencyStop(1500, signal),
  openStatusSocket: (url, callbacks) => createRobotApi(url).connectStatusWebSocket(
    callbacks.onStatus,
    callbacks.onError,
    callbacks.onOpen,
    callbacks.onClose,
  ),
  openMapSocket: (url, callbacks) => createRobotApi(url).connectMapWebSocket(
    1,
    callbacks.onSnapshot,
    (message, error) => callbacks.onError(error ? `${message} (${error})` : message),
    callbacks.onClose,
    callbacks.onOpen,
  ),
  storage: {
    getItem: (key) => AsyncStorage.getItem(key),
    setItem: (key, value) => AsyncStorage.setItem(key, value),
    removeItem: (key) => AsyncStorage.removeItem(key),
  },
  onChange: (snapshot) => {
    const connectionState: RobotStatus['connectionState'] = snapshot.phase === 'connected'
      ? 'connected'
      : snapshot.phase === 'probing' || snapshot.phase === 'switching'
        ? 'connecting'
        : snapshot.phase === 'error' || snapshot.phase === 'degraded'
          ? 'error'
          : 'disconnected';
    setState({
      baseUrl: snapshot.activeUrl ?? snapshot.config.primaryUrl,
      connectionConfig: snapshot.config,
      connectionPhase: snapshot.phase,
      connectionState,
      endpointSwitching: snapshot.phase === 'probing' || snapshot.phase === 'switching',
      endpointSwitchMessage: snapshot.error,
      refreshIntervalMs: snapshot.config.refreshIntervalMs,
      statusSource: snapshot.statusSource ?? state.statusSource,
      status: snapshot.status
        ? { ...snapshot.status, connectionState, online: snapshot.phase === 'connected' }
        : { ...state.status, connectionState, online: snapshot.phase === 'connected' },
      mapStreamState: snapshot.mapPhase,
      mapStreamConnected: snapshot.mapPhase === 'connected',
      lastMapError: snapshot.mapError,
    });
  },
  onMapSnapshot: (snapshot) => setState({
    mapSnapshot: snapshot,
    mapSource: 'ws',
    mapStreamConnected: true,
    mapStreamState: 'connected',
    lastMapFrameAt: Date.now(),
    lastMapError: undefined,
  }),
}, DEFAULT_CONFIG);
let connectionInitialization: Promise<void> | undefined;
let connectPendingOperation = 0;


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
  async initializeConnection() {
    connectionInitialization ??= connectionController.initialize();
    await connectionInitialization;
  },
  async saveConnectionConfigAndConnect(config: RobotConnectionConfig) {
    const saved = await connectionController.saveConnectionConfig(config);
    if (!saved) return { ok: false, message: '机器人地址格式无效', timestamp: Date.now() } as ConnectionTestResult;
    return robotActions.connectRobot();
  },
  async setRefreshInterval(refreshIntervalMs: number) {
    await connectionController.setRefreshInterval(refreshIntervalMs);
    addLog('user', `状态刷新周期已保存：${refreshIntervalMs}ms`, undefined, '设置');
  },
  async testConnectionEndpoint(which: 'primary' | 'fallback') {
    const started = Date.now();
    const response = await connectionController.testEndpoint(which);
    const label = which === 'primary' ? '主地址' : '备用地址';
    const result: ConnectionTestResult = {
      ok: response.ok,
      message: response.ok ? `${label}可达` : response.message ?? response.error ?? `${label}不可达`,
      latencyMs: Date.now() - started,
      timestamp: Date.now(),
    };
    setState({ httpTest: result, endpointSwitchMessage: result.message });
    return result;
  },
  async restoreDefaults() {
    await connectionController.saveConnectionConfig(DEFAULT_CONFIG);
    addLog('user', '已恢复默认主备地址和刷新周期', undefined, '设置');
  },
  async connectRobot() {
    const operation = ++connectPendingOperation;
    setPending('connectPending', true);
    try {
      const response = await connectionController.connect();
      return {
        ok: response.ok,
        message: response.ok ? `机器人连接成功：${connectionController.snapshot.activeUrl}` : response.message ?? response.error ?? '连接失败',
        timestamp: Date.now(),
      } as ConnectionTestResult;
    } finally {
      if (operation === connectPendingOperation) setPending('connectPending', false);
    }
  },
  async refreshStatus(logSuccess = false) {
    return run('GET /api/status', () => connectionController.refreshStatus(), logSuccess ? 'statusPending' : undefined, logSuccess);
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
    if (state.endpointSwitching) {
      return { ok: false, error: 'endpoint_switching', message: '连接正在切换，运动控制暂不可用' } as ApiResponse<null>;
    }
    return run('POST /api/cmd_vel', () => api().sendVelocity(command), quiet ? undefined : 'controlPending', !quiet);
  },
  async chassisStop() {
    if (state.endpointSwitching) {
      return { ok: false, error: 'endpoint_switching', message: '连接正在切换，请使用急停' } as ApiResponse<null>;
    }
    return run('POST /api/debug/chassis/stop', () => api().chassisStop(), 'controlPending');
  },
  async emergencyStopAllEndpoints() {
    setPending('controlPending', true);
    try {
      const success = await connectionController.emergencyStop();
      addLog(
        success ? 'user' : 'error',
        success ? '急停已送达机器人' : '急停请求未送达',
        undefined,
        '底盘控制',
      );
      return success;
    } finally {
      setPending('controlPending', false);
    }
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
    connectionController.stopMapStream();
    setState({ mapSnapshot: undefined, savedMap: undefined, mapSource: 'none', lastMapError: undefined });
    const response = await run('POST /api/debug/system/start/mapping', () => api().startMapping(), 'mappingStatusPending');
    await robotActions.refreshSystemStatus();
    await robotActions.refreshMappingStatus();
    return response;
  },
  async stopMapping() {
    const response = await run('POST /api/debug/system/stop/mapping', () => api().stopMapping(), 'mappingStatusPending');
    connectionController.stopMapStream();
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
    if (downsample !== 1) addLog('debug', '地图流由连接控制器固定使用 downsample=1', undefined, 'WebSocket');
    connectionController.startMapStream();
  },
  stopMapStream() {
    connectionController.stopMapStream();
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
