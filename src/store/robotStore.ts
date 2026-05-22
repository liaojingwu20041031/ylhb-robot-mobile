import * as Clipboard from 'expo-clipboard';
import { useSyncExternalStore } from 'react';
import { createDebugClient } from '../api/debugClient';
import { mockDebugClient, mockRobotClient, setMockScenario } from '../api/mockClient';
import { createRobotClient, StatusSocket } from '../api/robotClient';
import {
  ApiResponse,
  AppLog,
  AppLogType,
  ChassisTestRequest,
  ConnectionTestResult,
  DebugStatus,
  InitialPoseRequest,
  MappingSaveRequest,
  MockScenario,
  NavigationGoalRequest,
  PendingState,
  RobotStatus,
  StatusSource,
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
  mapping: false,
  navigation: false,
  copy: false,
};

let state: StoreState = {
  baseUrl: 'http://192.168.1.100:8000',
  mockMode: true,
  mockScenario: 'normal',
  websocketEnabled: false,
  refreshIntervalMs: 1000,
  statusSource: '未知',
  status: initialStatus,
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

function applyResponse<T>(label: string, response: ApiResponse<T>) {
  if (response.ok) {
    addLog('api', `${label}: ${response.message ?? 'ok'}`, undefined, state.mockMode ? 'Mock' : 'Bridge');
  } else {
    addLog('error', `${label}: ${response.message ?? response.error ?? 'failed'}`, response.error, state.mockMode ? 'Mock' : 'Bridge');
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
      setState({ debugStatus: response.data });
    }
    return response;
  },
  async startMapping() {
    return run('POST /api/debug/mapping/start', () => debugClient().startMapping(), 'mapping');
  },
  async saveMapping(body: MappingSaveRequest) {
    return run('POST /api/debug/mapping/save', () => debugClient().saveMapping(body), 'mapping');
  },
  async stopMapping() {
    return run('POST /api/debug/mapping/stop', () => debugClient().stopMapping(), 'mapping');
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
      buildStatusReport(state.status, state.debugStatus, state.statusSource, state.mockMode),
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
