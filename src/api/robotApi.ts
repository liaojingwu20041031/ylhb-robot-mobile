import { request, trimBaseUrl } from './http';
import {
  ApiResponse,
  ConfirmDefaultMapResult,
  DebugMapPreview,
  DebugStatus,
  DebugMapsList,
  DeleteMapResult,
  MapSnapshot,
  MappingSaveRequest,
  MappingStatus,
  ProcessMode,
  RenameMapRequest,
  RenameMapResult,
  RobotStatus,
  SavedMap,
  SystemStatus,
  VelocityCommand,
} from './types';

function normalizeTimestamp(value: unknown) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    return Date.now();
  }
  return numberValue < 10000000000 ? numberValue * 1000 : numberValue;
}

function normalizeStatus(raw: any): RobotStatus {
  return {
    online: Boolean(raw.online),
    connectionState: raw.connectionState ?? raw.connection_state ?? 'connected',
    canStatus: raw.canStatus ?? raw.can_status,
    zlacStatus: raw.zlacStatus ?? raw.zlac_status,
    systemMode: raw.systemMode ?? raw.system_mode,
    mappingStatus: raw.mappingStatus ?? raw.mapping_status,
    nav2Status: raw.nav2Status ?? raw.nav2_status,
    lastOdomAgeSec: raw.lastOdomAgeSec ?? raw.last_odom_age_sec,
    lastScanAgeSec: raw.lastScanAgeSec ?? raw.last_scan_age_sec,
    pose: raw.pose ?? null,
    velocity: raw.velocity ?? null,
    batteryPercent: raw.batteryPercent ?? raw.battery_percent,
    timestamp: normalizeTimestamp(raw.timestamp),
  };
}

function normalizeDebugStatus(raw: any): DebugStatus {
  return {
    online: Boolean(raw.online),
    topics: raw.topics ?? {},
    nodes: raw.nodes ?? {},
    lastOdomAgeSec: raw.lastOdomAgeSec ?? raw.last_odom_age_sec,
    lastScanAgeSec: raw.lastScanAgeSec ?? raw.last_scan_age_sec,
    lastMapAgeSec: raw.lastMapAgeSec ?? raw.last_map_age_sec,
    lastImuAgeSec: raw.lastImuAgeSec ?? raw.last_imu_age_sec,
    scanRangeMin: raw.scanRangeMin ?? raw.scan_range_min,
    scanRangeMax: raw.scanRangeMax ?? raw.scan_range_max,
    zlacStatus: raw.zlacStatus ?? raw.zlac_status,
    mappingStatus: raw.mappingStatus ?? raw.mapping_status,
    nav2Status: raw.nav2Status ?? raw.nav2_status,
    systemMode: raw.systemMode ?? raw.system_mode,
    pose: raw.pose ?? null,
    velocity: raw.velocity ?? null,
    mapMeta: raw.mapMeta ?? raw.map_meta ?? null,
  };
}

function normalizeMappingStatus(raw: any): MappingStatus {
  return {
    mappingStatus: raw.mappingStatus ?? raw.mapping_status ?? 'not_running',
    bringupReady: Boolean(raw.bringupReady ?? raw.bringup_ready),
    mapAvailable: Boolean(raw.mapAvailable ?? raw.map_available),
    recommendedNextAction: raw.recommendedNextAction ?? raw.recommended_next_action ?? 'start_bringup',
    process: raw.process ?? null,
    lastMapAgeSec: raw.lastMapAgeSec ?? raw.last_map_age_sec,
    mapMeta: raw.mapMeta ?? raw.map_meta ?? null,
  };
}

async function normalized<TInput, TOutput>(
  action: () => Promise<ApiResponse<TInput>>,
  normalize: (value: TInput) => TOutput,
): Promise<ApiResponse<TOutput>> {
  const response = await action();
  return response.ok && response.data
    ? { ...response, data: normalize(response.data) }
    : (response as unknown as ApiResponse<TOutput>);
}

export type StatusSocket = {
  close: () => void;
};

export type MapSocket = {
  close: () => void;
};

export function createRobotApi(baseUrl: string) {
  const systemProcess = (action: 'start' | 'stop', mode: ProcessMode) =>
    request<null>(baseUrl, `/api/debug/system/${action}/${mode}`, { method: 'POST' });

  return {
    getStatus: () => normalized<any, RobotStatus>(() => request<any>(baseUrl, '/api/status'), normalizeStatus),
    getDebugStatus: () => normalized<any, DebugStatus>(() => request<any>(baseUrl, '/api/debug/status'), normalizeDebugStatus),
    getSystemStatus: () => request<SystemStatus>(baseUrl, '/api/debug/system/status'),
    startBringup: () => systemProcess('start', 'bringup'),
    stopBringup: () => systemProcess('stop', 'bringup'),
    startMapping: () => systemProcess('start', 'mapping'),
    stopMapping: () => systemProcess('stop', 'mapping'),
    sendVelocity: (command: VelocityCommand) =>
      request<null>(baseUrl, '/api/cmd_vel', {
        method: 'POST',
        body: JSON.stringify(command),
      }),
    chassisStop: () =>
      request<null>(baseUrl, '/api/debug/chassis/stop', {
        method: 'POST',
      }),
    emergencyStop: () =>
      request<null>(baseUrl, '/api/stop', {
        method: 'POST',
      }),
    getMappingStatus: () =>
      normalized<any, MappingStatus>(() => request<any>(baseUrl, '/api/debug/mapping/status'), normalizeMappingStatus),
    getMapSnapshot: (downsample = 1) =>
      request<MapSnapshot>(baseUrl, `/api/debug/mapping/map_snapshot?downsample=${downsample}`),
    saveMapping: (body: MappingSaveRequest) =>
      request<SavedMap>(baseUrl, '/api/debug/mapping/save', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    getDebugMaps: () => request<DebugMapsList>(baseUrl, '/api/debug/maps'),
    getDebugMapPreview: (name: string, maxSizePx = 1024) =>
      request<DebugMapPreview>(
        baseUrl,
        `/api/debug/maps/${encodeURIComponent(name)}/preview?max_size_px=${encodeURIComponent(String(maxSizePx))}`,
      ),
    confirmDefaultDebugMap: (name: string) =>
      request<ConfirmDefaultMapResult>(baseUrl, `/api/debug/maps/${encodeURIComponent(name)}/confirm_default`, {
        method: 'POST',
      }),
    renameDebugMap: (name: string, body: RenameMapRequest) =>
      request<RenameMapResult>(baseUrl, `/api/debug/maps/${encodeURIComponent(name)}/rename`, {
        method: 'POST',
        body: JSON.stringify({ new_name: body.new_name }),
      }),
    deleteDebugMap: (name: string) =>
      request<DeleteMapResult>(baseUrl, `/api/debug/maps/${encodeURIComponent(name)}`, {
        method: 'DELETE',
      }),
    connectStatusWebSocket: (
      onStatus: (status: RobotStatus) => void,
      onError: (message: string) => void,
    ): StatusSocket => {
      const wsUrl = trimBaseUrl(baseUrl).replace(/^http/i, 'ws') + '/ws/status';
      const socket = new WebSocket(wsUrl);
      let closedByClient = false;
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as ApiResponse<any>;
          if (payload && typeof payload === 'object' && 'ok' in payload && !payload.ok) {
            onError(payload.message ?? payload.error ?? 'WebSocket status frame failed');
            return;
          }
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
      socket.onclose = () => {
        if (!closedByClient) {
          onError('WebSocket closed');
        }
      };
      return {
        close: () => {
          closedByClient = true;
          socket.close();
        },
      };
    },
    connectMapWebSocket: (
      downsample: number,
      onSnapshot: (snapshot: MapSnapshot) => void,
      onFrameError: (message: string, error?: string | null) => void,
      onClose: () => void,
    ): MapSocket => {
      const safeDownsample = Math.max(1, Math.min(16, Math.round(downsample || 1)));
      const wsUrl = trimBaseUrl(baseUrl).replace(/^http/i, 'ws') + `/ws/map?downsample=${safeDownsample}`;
      const socket = new WebSocket(wsUrl);
      let closedByClient = false;
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as ApiResponse<MapSnapshot>;
          if (!payload.ok) {
            onFrameError(payload.message ?? payload.error ?? 'map frame failed', payload.error);
            return;
          }
          if (payload.data) {
            onSnapshot(payload.data);
          }
        } catch (error) {
          onFrameError(error instanceof Error ? error.message : String(error));
        }
      };
      socket.onerror = () => onFrameError('WebSocket map connection error');
      socket.onclose = () => {
        if (!closedByClient) {
          onClose();
        }
      };
      return {
        close: () => {
          closedByClient = true;
          socket.close();
        },
      };
    },
  };
}
