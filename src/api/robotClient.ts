import { request, trimBaseUrl } from './http';
import {
  ApiResponse,
  RobotStatus,
  TaskCommand,
  VelocityCommand,
} from './types';

function normalizeStatus(raw: any): RobotStatus {
  return {
    online: Boolean(raw.online),
    connectionState: raw.connectionState ?? 'connected',
    canStatus: raw.canStatus ?? raw.can_status,
    zlacStatus: raw.zlacStatus ?? raw.zlac_status,
    systemMode: raw.systemMode ?? raw.system_mode,
    taskStatus: raw.taskStatus ?? raw.task_status,
    mappingStatus: raw.mappingStatus ?? raw.mapping_status,
    nav2Status: raw.nav2Status ?? raw.nav2_status,
    lastOdomAgeSec: raw.lastOdomAgeSec ?? raw.last_odom_age_sec,
    lastScanAgeSec: raw.lastScanAgeSec ?? raw.last_scan_age_sec,
    pose: raw.pose ?? null,
    velocity: raw.velocity ?? null,
    batteryPercent: raw.batteryPercent ?? raw.battery_percent,
    timestamp: raw.timestamp ? Number(raw.timestamp) * (raw.timestamp < 10000000000 ? 1000 : 1) : Date.now(),
  };
}

export type StatusSocket = {
  close: () => void;
};

export function createRobotClient(baseUrl: string) {
  return {
    getStatus: async () => {
      const response = await request<any>(baseUrl, '/api/status');
      return response.ok && response.data
        ? { ...response, data: normalizeStatus(response.data) }
        : (response as ApiResponse<RobotStatus>);
    },
    sendVelocity: (command: VelocityCommand) =>
      request<null>(baseUrl, '/api/cmd_vel', {
        method: 'POST',
        body: JSON.stringify(command),
      }),
    sendTextCommand: (text: string) =>
      request<null>(baseUrl, '/api/text_command', {
        method: 'POST',
        body: JSON.stringify({ text }),
      }),
    sendTask: (command: TaskCommand) =>
      request<null>(baseUrl, '/api/task', {
        method: 'POST',
        body: JSON.stringify(command),
      }),
    stop: () =>
      request<null>(baseUrl, '/api/stop', {
        method: 'POST',
      }),
    connectStatusWebSocket: (
      onStatus: (status: RobotStatus) => void,
      onError: (message: string) => void,
    ): StatusSocket => {
      const wsUrl = trimBaseUrl(baseUrl).replace(/^http/i, 'ws') + '/ws/status';
      const socket = new WebSocket(wsUrl);
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const status = payload && typeof payload === 'object' && 'ok' in payload ? payload.data : payload;
          if (!status) {
            onError(payload?.message ?? payload?.error ?? 'WebSocket status payload empty');
            return;
          }
          onStatus(normalizeStatus(status));
        } catch (error) {
          onError(error instanceof Error ? error.message : String(error));
        }
      };
      socket.onerror = () => onError('WebSocket connection error');
      socket.onclose = () => onError('WebSocket closed');
      return {
        close: () => socket.close(),
      };
    },
  };
}
