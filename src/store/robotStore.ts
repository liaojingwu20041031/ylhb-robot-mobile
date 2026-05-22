import { useSyncExternalStore } from 'react';
import { createDebugClient } from '../api/debugClient';
import { mockDebugClient, mockRobotClient } from '../api/mockClient';
import { createRobotClient, StatusSocket } from '../api/robotClient';
import {
  ApiResponse,
  AppLog,
  AppLogType,
  ChassisTestRequest,
  DebugStatus,
  InitialPoseRequest,
  MappingSaveRequest,
  NavigationGoalRequest,
  RobotStatus,
  TaskCommand,
  VelocityCommand,
} from '../api/types';

type StoreState = {
  baseUrl: string;
  mockMode: boolean;
  websocketEnabled: boolean;
  status: RobotStatus;
  debugStatus?: DebugStatus;
  logs: AppLog[];
};

const initialStatus: RobotStatus = {
  online: false,
  connectionState: 'disconnected',
  taskStatus: 'idle',
  mappingStatus: 'unknown',
  nav2Status: 'unknown',
  timestamp: Date.now(),
};

let state: StoreState = {
  baseUrl: 'http://192.168.1.100:8000',
  mockMode: true,
  websocketEnabled: false,
  status: initialStatus,
  logs: [],
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

function addLog(type: AppLogType, message: string, detail?: string) {
  const log: AppLog = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    message,
    detail,
    timestamp: Date.now(),
  };
  setState({ logs: [log, ...state.logs].slice(0, 300) });
}

function robotClient() {
  return state.mockMode ? mockRobotClient : createRobotClient(state.baseUrl);
}

function debugClient() {
  return state.mockMode ? mockDebugClient : createDebugClient(state.baseUrl);
}

function applyResponse<T>(label: string, response: ApiResponse<T>) {
  if (response.ok) {
    addLog('api', `${label}: ${response.message ?? 'ok'}`);
  } else {
    addLog('error', `${label}: ${response.message ?? response.error ?? 'failed'}`);
  }
}

async function run<T>(label: string, action: () => Promise<ApiResponse<T>>) {
  addLog('api', `${label}: request`);
  const response = await action();
  applyResponse(label, response);
  return response;
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
  },
  saveSettings(baseUrl: string, mockMode: boolean, websocketEnabled: boolean) {
    setState({ baseUrl, mockMode, websocketEnabled });
    addLog('info', `settings saved: ${mockMode ? 'Mock' : 'Real Robot'}`);
  },
  async refreshStatus() {
    setState({ status: { ...state.status, connectionState: 'connecting' } });
    const response = await run('GET /api/status', () => robotClient().getStatus());
    if (response.ok && response.data) {
      setState({
        status: {
          ...response.data,
          connectionState: 'connected',
          online: response.data.online,
        },
      });
    } else {
      setState({ status: { ...state.status, connectionState: 'error', online: false } });
    }
    return response;
  },
  startStatusSocket() {
    if (socket || state.mockMode || !state.websocketEnabled) {
      return;
    }
    socket = createRobotClient(state.baseUrl).connectStatusWebSocket(
      (status) => {
        setState({ status: { ...status, connectionState: 'connected' } });
      },
      (message) => {
        addLog('warn', message);
        socket = null;
      },
    );
    addLog('info', 'WebSocket status stream opened');
  },
  stopStatusSocket() {
    socket?.close();
    socket = null;
    addLog('info', 'WebSocket status stream closed');
  },
  async sendVelocity(command: VelocityCommand) {
    return run('POST /api/cmd_vel', () => robotClient().sendVelocity(command));
  },
  async sendTextCommand(text: string) {
    return run('POST /api/text_command', () => robotClient().sendTextCommand(text));
  },
  async sendTask(command: TaskCommand) {
    return run('POST /api/task', () => robotClient().sendTask(command));
  },
  async stop() {
    return run('POST /api/stop', () => robotClient().stop());
  },
  async refreshDebugStatus() {
    const response = await run('GET /api/debug/status', () => debugClient().getDebugStatus());
    if (response.ok && response.data) {
      setState({ debugStatus: response.data });
    }
    return response;
  },
  async chassisTest(command: ChassisTestRequest) {
    return run('POST /api/debug/chassis/test', () => debugClient().chassisTest(command));
  },
  async chassisStop() {
    return run('POST /api/debug/chassis/stop', () => debugClient().chassisStop());
  },
  async mappingStatus() {
    const response = await run('GET /api/debug/mapping/status', () =>
      debugClient().getMappingStatus(),
    );
    if (response.ok && response.data) {
      setState({ debugStatus: response.data });
    }
    return response;
  },
  async startMapping() {
    return run('POST /api/debug/mapping/start', () => debugClient().startMapping());
  },
  async saveMapping(body: MappingSaveRequest) {
    return run('POST /api/debug/mapping/save', () => debugClient().saveMapping(body));
  },
  async stopMapping() {
    return run('POST /api/debug/mapping/stop', () => debugClient().stopMapping());
  },
  async navigationStatus() {
    const response = await run('GET /api/debug/navigation/status', () =>
      debugClient().getNavigationStatus(),
    );
    if (response.ok && response.data) {
      setState({ debugStatus: response.data });
    }
    return response;
  },
  async startNavigation() {
    return run('POST /api/debug/navigation/start', () => debugClient().startNavigation());
  },
  async setInitialPose(body: InitialPoseRequest) {
    return run('POST /api/debug/navigation/set_initial_pose', () =>
      debugClient().setInitialPose(body),
    );
  },
  async sendNavigationGoal(body: NavigationGoalRequest) {
    return run('POST /api/debug/navigation/goal', () =>
      debugClient().sendNavigationGoal(body),
    );
  },
  async cancelNavigation() {
    return run('POST /api/debug/navigation/cancel', () => debugClient().cancelNavigation());
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
