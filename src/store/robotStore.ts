import * as Clipboard from 'expo-clipboard';
import { useSyncExternalStore } from 'react';
import { createDebugClient } from '../api/debugClient';
import { mockDebugClient, mockPatrolClient, mockRobotClient, mockRouteClient, setMockScenario } from '../api/mockClient';
import { createPatrolClient } from '../api/patrolClient';
import { createRobotClient, StatusSocket } from '../api/robotClient';
import { createRouteClient } from '../api/routeClient';
import {
  ApiResponse,
  AppLog,
  AppLogType,
  ChassisTestRequest,
  ConnectionTestResult,
  DebugStatus,
  InitialPoseRequest,
  MapSnapshot,
  MappingSaveRequest,
  MappingStatus,
  MockScenario,
  NavigationGoalRequest,
  PatrolCommand,
  PatrolEvent,
  PatrolRouteActiveResponse,
  PatrolRouteMapInfo,
  PatrolStatus,
  PendingState,
  RobotStatus,
  StatusSource,
  SystemStatus,
  TaskCommand,
  VelocityCommand,
} from '../api/types';
import { buildStatusReport, formatLogs } from '../utils/status';

type StoreState = {
  baseUrl: string;
  mockMode: boolean;
  mockScenario: MockScenario;
  websocketEnabled: boolean;
  refreshIntervalMs: number;
  statusSource: StatusSource;
  status: RobotStatus;
  debugStatus?: DebugStatus;
  systemStatus?: SystemStatus;
  mappingDebugStatus?: MappingStatus;
  mapSnapshot?: MapSnapshot;
  routeMap?: PatrolRouteMapInfo;
  activeRoute?: PatrolRouteActiveResponse;
  patrolStatus?: PatrolStatus;
  patrolEvents: PatrolEvent[];
  logs: AppLog[];
  pending: PendingState;
  httpTest?: ConnectionTestResult;
  websocketTest?: ConnectionTestResult;
};

const initialStatus: RobotStatus = {
  online: false,
  connectionState: 'disconnected',
  timestamp: Date.now(),
};

const initialPending: PendingState = {
  status: false,
  stop: false,
  velocity: false,
  task: false,
  debug: false,
  system: false,
  mapping: false,
  navigation: false,
  copy: false,
  route: false,
  patrol: false,
};

let state: StoreState = {
  baseUrl: 'http://192.168.1.100:8000',
  mockMode: true,
  mockScenario: 'normal',
  websocketEnabled: false,
  refreshIntervalMs: 1000,
  statusSource: '未知',
  status: initialStatus,
  patrolEvents: [],
  logs: [],
  pending: initialPending,
};

let socket: StatusSocket | null = null;
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

function robotClient() {
  return state.mockMode ? mockRobotClient : createRobotClient(state.baseUrl);
}

function debugClient() {
  return state.mockMode ? mockDebugClient : createDebugClient(state.baseUrl);
}

function routeClient() {
  return state.mockMode ? mockRouteClient : createRouteClient(state.baseUrl);
}

function patrolClient() {
  return state.mockMode ? mockPatrolClient : createPatrolClient(state.baseUrl);
}

function responseDetail(value: string | null | undefined) {
  return value ?? undefined;
}

function applyResponse<T>(label: string, response: ApiResponse<T>) {
  if (response.ok) {
    addLog('api', `${label}: ${response.message ?? 'ok'}`, undefined, state.mockMode ? 'Mock' : 'Bridge');
  } else {
    addLog('error', `${label}: ${response.message ?? response.error ?? 'failed'}`, responseDetail(response.error), state.mockMode ? 'Mock' : 'Bridge');
  }
}

async function run<T>(
  label: string,
  action: () => Promise<ApiResponse<T>>,
  pendingKey?: keyof PendingState,
) {
  if (pendingKey) {
    setPending(pendingKey, true);
  }
  addLog('api', `${label}: request`, undefined, state.mockMode ? 'Mock' : 'Bridge');
  try {
    const response = await action();
    applyResponse(label, response);
    return response;
  } finally {
    if (pendingKey) {
      setPending(pendingKey, false);
    }
  }
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
    addLog('user', '日志已清空', undefined, '用户操作');
  },
  saveSettings(baseUrl: string, mockMode: boolean, websocketEnabled: boolean, refreshIntervalMs = state.refreshIntervalMs) {
    if (state.mockMode !== mockMode && socket) {
      robotActions.stopStatusSocket();
    }
    setState({ baseUrl, mockMode, websocketEnabled, refreshIntervalMs });
    addLog('info', `设置已保存：${mockMode ? 'Mock Mode' : 'Real Robot Mode'}`, undefined, '设置');
  },
  async setMockScenario(scenario: MockScenario) {
    setMockScenario(scenario);
    setState({ mockScenario: scenario });
    addLog('debug', `Mock 演示场景切换：${scenario}`, undefined, 'Mock');
    await robotActions.refreshStatus();
    await robotActions.refreshDebugStatus();
    await robotActions.refreshSystemStatus();
    await robotActions.mappingStatus();
    setState({ mapSnapshot: undefined });
  },
  async refreshStatus() {
    setState({ status: { ...state.status, connectionState: 'connecting' } });
    const response = await run('GET /api/status', () => robotClient().getStatus(), 'status');
    if (response.ok && response.data) {
      setState({
        statusSource: state.mockMode ? 'Mock' : 'HTTP Polling',
        status: {
          ...response.data,
          connectionState: 'connected',
          online: response.data.online,
        },
      });
    } else {
      setState({ statusSource: state.mockMode ? 'Mock' : 'HTTP Polling', status: { ...state.status, connectionState: 'error', online: false } });
    }
    return response;
  },
  startStatusSocket() {
    if (socket || state.mockMode || !state.websocketEnabled) {
      return;
    }
    socket = createRobotClient(state.baseUrl).connectStatusWebSocket(
      (status) => {
        setState({ statusSource: 'WebSocket', status: { ...status, connectionState: 'connected' } });
      },
      (message) => {
        addLog('warn', message, undefined, 'WebSocket');
        socket = null;
      },
    );
    addLog('info', 'WebSocket 状态流已打开', undefined, 'WebSocket');
  },
  stopStatusSocket() {
    socket?.close();
    socket = null;
    addLog('info', 'WebSocket 状态流已关闭', undefined, 'WebSocket');
  },
  async testHttpConnection() {
    const started = Date.now();
    const response = await robotActions.refreshStatus();
    const result: ConnectionTestResult = {
      ok: response.ok,
      message: response.ok ? '/api/status 正常' : response.message ?? response.error ?? '/api/status 失败',
      latencyMs: Date.now() - started,
      timestamp: Date.now(),
    };
    setState({ httpTest: result });
    return result;
  },
  async testWebSocket() {
    const started = Date.now();
    if (state.mockMode) {
      const result = { ok: true, message: 'Mock Mode 不需要 WebSocket，演示状态正常', latencyMs: 0, timestamp: Date.now() };
      setState({ websocketTest: result });
      addLog('info', result.message, undefined, 'WebSocket');
      return result;
    }
    try {
      robotActions.startStatusSocket();
      const result = { ok: true, message: 'WebSocket 已尝试连接，请观察状态来源', latencyMs: Date.now() - started, timestamp: Date.now() };
      setState({ websocketTest: result });
      return result;
    } catch (error) {
      const result = { ok: false, message: error instanceof Error ? error.message : String(error), latencyMs: Date.now() - started, timestamp: Date.now() };
      setState({ websocketTest: result });
      addLog('error', result.message, undefined, 'WebSocket');
      return result;
    }
  },
  restoreDefaults() {
    setState({
      baseUrl: 'http://192.168.1.100:8000',
      mockMode: true,
      websocketEnabled: false,
      refreshIntervalMs: 1000,
    });
    addLog('user', '已恢复默认配置', undefined, '设置');
  },
  async sendVelocity(command: VelocityCommand) {
    return run('POST /api/cmd_vel', () => robotClient().sendVelocity(command), 'velocity');
  },
  async sendTextCommand(text: string) {
    return run('POST /api/text_command', () => robotClient().sendTextCommand(text), 'task');
  },
  async sendTask(command: TaskCommand) {
    return run('POST /api/task', () => robotClient().sendTask(command), 'task');
  },
  async stop() {
    return run('POST /api/stop', () => robotClient().stop(), 'stop');
  },
  async refreshSystemStatus() {
    const response = await run('GET /api/debug/system/status', () => debugClient().getSystemStatus(), 'system');
    if (response.ok && response.data) {
      setState({ systemStatus: response.data });
    }
    return response;
  },
  async startBringup() {
    const response = await run('POST /api/debug/system/start/bringup', () => debugClient().startBringup(), 'system');
    await robotActions.refreshSystemStatus();
    await robotActions.refreshDebugStatus();
    return response;
  },
  async stopBringup() {
    if (state.systemStatus?.mapping?.running) {
      addLog('warn', '停止底盘前先停止 mapping 进程', undefined, '系统进程');
      await robotActions.stopMapping();
    }
    const response = await run('POST /api/debug/system/stop/bringup', () => debugClient().stopBringup(), 'system');
    await robotActions.refreshSystemStatus();
    await robotActions.refreshDebugStatus();
    return response;
  },
  async refreshDebugStatus() {
    const response = await run('GET /api/debug/status', () => debugClient().getDebugStatus(), 'debug');
    if (response.ok && response.data) {
      setState({ debugStatus: response.data });
    }
    return response;
  },
  async chassisTest(command: ChassisTestRequest) {
    return run('POST /api/debug/chassis/test', () => debugClient().chassisTest(command), 'velocity');
  },
  async chassisStop() {
    return run('POST /api/debug/chassis/stop', () => debugClient().chassisStop(), 'velocity');
  },
  async mappingStatus() {
    const response = await run('GET /api/debug/mapping/status', () => debugClient().getMappingStatus(), 'mapping');
    if (response.ok && response.data) {
      setState({ mappingDebugStatus: response.data });
    }
    return response;
  },
  async startMapping() {
    const response = await run('POST /api/debug/system/start/mapping', () => debugClient().startMapping(), 'mapping');
    await robotActions.refreshSystemStatus();
    await robotActions.mappingStatus();
    return response;
  },
  async saveMapping(body: MappingSaveRequest) {
    return run('POST /api/debug/mapping/save', () => debugClient().saveMapping(body), 'mapping');
  },
  async refreshMapSnapshot(downsample = 1) {
    const response = await run(`GET /api/debug/mapping/map_snapshot?downsample=${downsample}`, () => debugClient().getMapSnapshot(downsample), 'mapping');
    if (response.ok && response.data) {
      setState({ mapSnapshot: response.data });
    } else if (response.error === 'no_map') {
      setState({ mapSnapshot: undefined });
    }
    return response;
  },
  async stopMapping() {
    const response = await run('POST /api/debug/system/stop/mapping', () => debugClient().stopMapping(), 'mapping');
    await robotActions.refreshSystemStatus();
    await robotActions.mappingStatus();
    return response;
  },
  async navigationStatus() {
    const response = await run('GET /api/debug/navigation/status', () => debugClient().getNavigationStatus(), 'navigation');
    if (response.ok && response.data) {
      setState({ debugStatus: response.data });
    }
    return response;
  },
  async startNavigation() {
    return run('POST /api/debug/navigation/start', () => debugClient().startNavigation(), 'navigation');
  },
  async setInitialPose(body: InitialPoseRequest) {
    return run('POST /api/debug/navigation/set_initial_pose', () => debugClient().setInitialPose(body), 'navigation');
  },
  async sendNavigationGoal(body: NavigationGoalRequest) {
    return run('POST /api/debug/navigation/goal', () => debugClient().sendNavigationGoal(body), 'navigation');
  },
  async cancelNavigation() {
    return run('POST /api/debug/navigation/cancel', () => debugClient().cancelNavigation(), 'navigation');
  },
  // ===== Route / Patrol =====
  async refreshRouteMap() {
    const response = await run('GET /api/debug/route/map', () => routeClient().getRouteMap());
    if (response.ok && response.data) {
      setState({ routeMap: response.data });
    } else if (!state.mockMode) {
      addLog('warn', '机器人端未实现 GET /api/debug/route/map，路线地图无法加载', responseDetail(response.error), 'Bridge');
    }
    return response;
  },
  async refreshActiveRoute() {
    const response = await run('GET /api/debug/route/active', () => routeClient().getActiveRoute());
    if (response.ok && response.data) {
      setState({ activeRoute: response.data });
    } else if (!state.mockMode) {
      addLog('warn', '机器人端未实现 GET /api/debug/route/active，路线文件无法加载', responseDetail(response.error), 'Bridge');
    }
    return response;
  },
  // 组合刷新路线地图 + 活动路线，统一管理 pending.route 避免两个 run 共用 finally 闪烁
  async refreshRouteView() {
    setPending('route', true);
    try {
      await robotActions.refreshRouteMap();
      await robotActions.refreshActiveRoute();
    } finally {
      setPending('route', false);
    }
  },
  async refreshPatrolStatus() {
    const response = await run('GET /api/debug/patrol/status', () => patrolClient().getPatrolStatus(), 'patrol');
    if (response.ok && response.data) {
      setState({ patrolStatus: response.data });
    } else if (!state.mockMode) {
      addLog('warn', '机器人端未实现 GET /api/debug/patrol/status', responseDetail(response.error), 'Bridge');
    }
    return response;
  },
  async refreshPatrolEvents() {
    const response = await run('GET /api/debug/patrol/events', () => patrolClient().getPatrolEvents(), 'patrol');
    if (response.ok && response.data) {
      setState({ patrolEvents: response.data });
    } else if (!state.mockMode) {
      addLog('warn', '机器人端未实现 GET /api/debug/patrol/events', responseDetail(response.error), 'Bridge');
    }
    return response;
  },
  async startPatrolProcess() {
    return run('POST /api/debug/patrol/start_process', () => patrolClient().startPatrolProcess(), 'patrol');
  },
  async sendPatrolCommand(body: PatrolCommand) {
    const response = await run('POST /api/debug/patrol/command', () => patrolClient().sendPatrolCommand(body), 'patrol');
    if (response.ok) {
      await robotActions.refreshPatrolStatus();
      await robotActions.refreshPatrolEvents();
    }
    return response;
  },
  async startPatrol(routeId?: string) {
    return robotActions.sendPatrolCommand({ command: 'start', route_id: routeId });
  },
  async pausePatrol() {
    return robotActions.sendPatrolCommand({ command: 'pause' });
  },
  async resumePatrol() {
    return robotActions.sendPatrolCommand({ command: 'resume' });
  },
  async cancelPatrol() {
    return robotActions.sendPatrolCommand({ command: 'cancel' });
  },
  async reloadPatrolRoute() {
    return robotActions.sendPatrolCommand({ command: 'reload' });
  },
  async initializePatrolPose() {
    const response = await robotActions.sendPatrolCommand({ command: 'initialize' });
    const startPose = state.activeRoute?.route?.start_pose;
    if (startPose) {
      await robotActions.setInitialPose({ x: startPose.pose.x, y: startPose.pose.y, yaw: startPose.pose.yaw });
    }
    return response;
  },
  async copyText(label: string, text: string) {
    setPending('copy', true);
    try {
      await Clipboard.setStringAsync(text);
      addLog('user', `${label}已复制为纯文本`, undefined, '复制');
    } catch (error) {
      addLog('error', `${label}复制失败`, error instanceof Error ? error.message : String(error), '复制');
    } finally {
      setPending('copy', false);
    }
  },
  async copyStatusReport() {
    return robotActions.copyText(
      '状态报告',
      buildStatusReport(state.status, state.debugStatus, state.statusSource, state.mockMode, state.patrolStatus, state.activeRoute),
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
