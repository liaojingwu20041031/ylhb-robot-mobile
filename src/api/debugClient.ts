import {
  ApiResponse,
  ChassisTestRequest,
  DebugStatus,
  InitialPoseRequest,
  MappingSaveRequest,
  NavigationGoalRequest,
} from './types';

const trimBaseUrl = (baseUrl: string) => baseUrl.replace(/\/+$/, '');

async function request<T>(
  baseUrl: string,
  path: string,
  options?: RequestInit,
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${trimBaseUrl(baseUrl)}${path}`, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(options?.headers ?? {}),
      },
      ...options,
    });
    const json = (await response.json().catch(() => null)) as ApiResponse<T> | T | null;
    if (!response.ok) {
      return {
        ok: false,
        error: `http_${response.status}`,
        message: (json as ApiResponse<T> | null)?.message ?? response.statusText,
      };
    }
    if (json && typeof json === 'object' && 'ok' in json) {
      return json as ApiResponse<T>;
    }
    return { ok: true, data: json as T };
  } catch (error) {
    return {
      ok: false,
      error: 'network_error',
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

function normalizeDebugStatus(raw: any): DebugStatus {
  return {
    online: Boolean(raw.online),
    topics: raw.topics ?? {},
    nodes: raw.nodes ?? {},
    lastOdomAgeSec: raw.lastOdomAgeSec ?? raw.last_odom_age_sec,
    lastScanAgeSec: raw.lastScanAgeSec ?? raw.last_scan_age_sec,
    lastMapAgeSec: raw.lastMapAgeSec ?? raw.last_map_age_sec,
    scanRangeMin: raw.scanRangeMin ?? raw.scan_range_min,
    scanRangeMax: raw.scanRangeMax ?? raw.scan_range_max,
    zlacStatus: raw.zlacStatus ?? raw.zlac_status,
    mappingStatus: raw.mappingStatus ?? raw.mapping_status,
    nav2Status: raw.nav2Status ?? raw.nav2_status,
    taskStatus: raw.taskStatus ?? raw.task_status,
    systemMode: raw.systemMode ?? raw.system_mode,
    salesDialogueStatus: raw.salesDialogueStatus ?? raw.sales_dialogue_status,
    cart: typeof raw.cart === 'string' ? raw.cart : raw.cart ? JSON.stringify(raw.cart) : undefined,
  };
}

export function createDebugClient(baseUrl: string) {
  return {
    getDebugStatus: async () => {
      const response = await request<any>(baseUrl, '/api/debug/status');
      return response.ok && response.data
        ? { ...response, data: normalizeDebugStatus(response.data) }
        : (response as ApiResponse<DebugStatus>);
    },
    chassisTest: (body: ChassisTestRequest) =>
      request<null>(baseUrl, '/api/debug/chassis/test', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    chassisStop: () =>
      request<null>(baseUrl, '/api/debug/chassis/stop', {
        method: 'POST',
      }),
    getMappingStatus: async () => {
      const response = await request<any>(baseUrl, '/api/debug/mapping/status');
      return response.ok && response.data
        ? { ...response, data: normalizeDebugStatus(response.data) }
        : (response as ApiResponse<DebugStatus>);
    },
    startMapping: () =>
      request<null>(baseUrl, '/api/debug/mapping/start', {
        method: 'POST',
      }),
    saveMapping: (body: MappingSaveRequest = {}) =>
      request<{ yaml_path: string; pgm_path: string }>(baseUrl, '/api/debug/mapping/save', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    stopMapping: () =>
      request<null>(baseUrl, '/api/debug/mapping/stop', {
        method: 'POST',
      }),
    getNavigationStatus: async () => {
      const response = await request<any>(baseUrl, '/api/debug/navigation/status');
      return response.ok && response.data
        ? { ...response, data: normalizeDebugStatus(response.data) }
        : (response as ApiResponse<DebugStatus>);
    },
    startNavigation: () =>
      request<null>(baseUrl, '/api/debug/navigation/start', {
        method: 'POST',
      }),
    setInitialPose: (body: InitialPoseRequest) =>
      request<null>(baseUrl, '/api/debug/navigation/set_initial_pose', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    sendNavigationGoal: (body: NavigationGoalRequest) =>
      request<{ accepted: boolean }>(baseUrl, '/api/debug/navigation/goal', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    cancelNavigation: () =>
      request<null>(baseUrl, '/api/debug/navigation/cancel', {
        method: 'POST',
      }),
  };
}
