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
  NetworkInterfaceInfo,
  NetworkWarning,
  ProcessMode,
  RenameMapRequest,
  RenameMapResult,
  RobotEndpointInfo,
  RobotNetworkStatus,
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

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
}

function normalizeEndpointInfo(value: unknown): RobotEndpointInfo | null {
  const raw = asRecord(value);
  const url = typeof raw.url === 'string' ? raw.url : '';
  if (!url) return null;
  return {
    interface: typeof raw.interface === 'string' ? raw.interface : undefined,
    type: typeof raw.type === 'string' ? raw.type : undefined,
    label: typeof raw.label === 'string' ? raw.label : undefined,
    address: typeof raw.address === 'string' ? raw.address : undefined,
    port: Number.isFinite(Number(raw.port)) ? Number(raw.port) : undefined,
    url,
    available: raw.available === undefined ? undefined : Boolean(raw.available),
    linkUp: raw.linkUp === undefined && raw.link_up === undefined ? undefined : Boolean(raw.linkUp ?? raw.link_up),
  };
}

function normalizeNetwork(value: unknown): RobotNetworkStatus | undefined {
  const raw = asRecord(value);
  if (Object.keys(raw).length === 0) return undefined;
  const endpointRows = raw.appEndpoints ?? raw.app_endpoints;
  const candidateRows = raw.candidateEndpoints ?? raw.candidate_endpoints;
  const interfaceRows = raw.interfaces ?? raw.networkInterfaces ?? raw.network_interfaces;
  const warningRows = raw.warnings ?? raw.networkWarnings ?? raw.network_warnings;
  const preferredRaw = raw.preferredAppEndpoint ?? raw.preferred_app_endpoint;
  const appEndpoints = Array.isArray(endpointRows)
    ? endpointRows.map(normalizeEndpointInfo).filter((item): item is RobotEndpointInfo => item !== null)
    : [];
  const candidateEndpoints = Array.isArray(candidateRows)
    ? candidateRows.map(normalizeEndpointInfo).filter((item): item is RobotEndpointInfo => item !== null)
    : [];
  const interfaces: NetworkInterfaceInfo[] = Array.isArray(interfaceRows)
    ? interfaceRows.map((item) => {
        const entry = asRecord(item);
        return {
          name: String(entry.name ?? ''),
          type: String(entry.type ?? 'other'),
          label: String(entry.label ?? entry.name ?? '其他网络'),
          address: String(entry.address ?? ''),
          prefixLength: Number.isFinite(Number(entry.prefixLength ?? entry.prefix_length)) ? Number(entry.prefixLength ?? entry.prefix_length) : undefined,
          gateway: typeof entry.gateway === 'string' ? entry.gateway : undefined,
          defaultRoute: entry.defaultRoute === undefined && entry.default_route === undefined ? undefined : Boolean(entry.defaultRoute ?? entry.default_route),
          metric: Number.isFinite(Number(entry.metric)) ? Number(entry.metric) : undefined,
          up: entry.up === undefined ? undefined : Boolean(entry.up),
        };
      }).filter((item) => item.name && item.address)
    : [];
  const warnings: NetworkWarning[] = Array.isArray(warningRows)
    ? warningRows.map((item) => {
        const entry = asRecord(item);
        return { code: String(entry.code ?? ''), message: String(entry.message ?? '') };
      }).filter((item) => item.code && item.message)
    : [];
  return {
    appEndpoints,
    candidateEndpoints,
    interfaces,
    preferredAppEndpoint: normalizeEndpointInfo(preferredRaw) ?? undefined,
    warnings,
  };
}

function normalizeStatus(input: unknown): RobotStatus {
  const raw = asRecord(input);
  const connectionState = raw.connectionState ?? raw.connection_state;
  return {
    apiVersion: typeof raw.apiVersion === 'string' ? raw.apiVersion : undefined,
    robotId: typeof raw.robotId === 'string' ? raw.robotId : undefined,
    bridgeInstanceId: typeof raw.bridgeInstanceId === 'string' ? raw.bridgeInstanceId : undefined,
    online: Boolean(raw.online),
    connectionState: ['disconnected', 'connecting', 'connected', 'error'].includes(String(connectionState))
      ? String(connectionState) as RobotStatus['connectionState']
      : 'connected',
    canStatus: String(raw.canStatus ?? raw.can_status ?? '') || undefined,
    zlacStatus: String(raw.zlacStatus ?? raw.zlac_status ?? '') || undefined,
    systemMode: String(raw.systemMode ?? raw.system_mode ?? '') || undefined,
    mappingStatus: String(raw.mappingStatus ?? raw.mapping_status ?? '') || undefined,
    nav2Status: String(raw.nav2Status ?? raw.nav2_status ?? '') || undefined,
    lastOdomAgeSec: Number.isFinite(Number(raw.lastOdomAgeSec ?? raw.last_odom_age_sec)) ? Number(raw.lastOdomAgeSec ?? raw.last_odom_age_sec) : undefined,
    lastScanAgeSec: Number.isFinite(Number(raw.lastScanAgeSec ?? raw.last_scan_age_sec)) ? Number(raw.lastScanAgeSec ?? raw.last_scan_age_sec) : undefined,
    pose: (raw.pose as RobotStatus['pose']) ?? null,
    velocity: (raw.velocity as RobotStatus['velocity']) ?? null,
    batteryPercent: Number.isFinite(Number(raw.batteryPercent ?? raw.battery_percent)) ? Number(raw.batteryPercent ?? raw.battery_percent) : undefined,
    network: normalizeNetwork(raw.network),
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
    getStatus: (timeoutMs = 3000, signal?: AbortSignal) => normalized<unknown, RobotStatus>(
      () => request<unknown>(baseUrl, '/api/status', { timeoutMs, signal }),
      normalizeStatus,
    ),
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
    emergencyStop: (timeoutMs = 3000, signal?: AbortSignal) =>
      request<null>(baseUrl, '/api/stop', {
        method: 'POST',
        timeoutMs,
        signal,
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
      onOpen: () => void = () => undefined,
      onClose: () => void = () => undefined,
    ): StatusSocket => {
      const wsUrl = trimBaseUrl(baseUrl).replace(/^http/i, 'ws') + '/ws/status';
      const socket = new WebSocket(wsUrl);
      let closedByClient = false;
      socket.onopen = onOpen;
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as ApiResponse<unknown>;
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
    connectMapWebSocket: (
      downsample: number,
      onSnapshot: (snapshot: MapSnapshot) => void,
      onFrameError: (message: string, error?: string | null) => void,
      onClose: () => void,
      onOpen: () => void = () => undefined,
    ): MapSocket => {
      const safeDownsample = Math.max(1, Math.min(16, Math.round(downsample || 1)));
      const wsUrl = trimBaseUrl(baseUrl).replace(/^http/i, 'ws') + `/ws/map?downsample=${safeDownsample}`;
      const socket = new WebSocket(wsUrl);
      let closedByClient = false;
      socket.onopen = onOpen;
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
