import { request } from './http';
import {
  ApiResponse,
  ChassisTestRequest,
  DebugStatus,
  InitialPoseRequest,
  MapSnapshot,
  MappingSaveRequest,
  MappingStatus,
  NavigationGoalRequest,
  ProcessMode,
  SavedMap,
  SystemStatus,
} from './types';

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
    taskStatus: raw.taskStatus ?? raw.task_status,
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

export function createDebugClient(baseUrl: string) {
  const systemProcess = (action: 'start' | 'stop', mode: ProcessMode) =>
    request<null>(baseUrl, `/api/debug/system/${action}/${mode}`, { method: 'POST' });

  return {
    getSystemStatus: () => request<SystemStatus>(baseUrl, '/api/debug/system/status'),
    startBringup: () => systemProcess('start', 'bringup'),
    stopBringup: () => systemProcess('stop', 'bringup'),
    startMappingProcess: () => systemProcess('start', 'mapping'),
    stopMappingProcess: () => systemProcess('stop', 'mapping'),
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
        ? { ...response, data: normalizeMappingStatus(response.data) }
        : (response as ApiResponse<MappingStatus>);
    },
    startMapping: () => systemProcess('start', 'mapping'),
    saveMapping: (body: MappingSaveRequest = {}) =>
      request<SavedMap>(baseUrl, '/api/debug/mapping/save', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    stopMapping: () => systemProcess('stop', 'mapping'),
    getMapSnapshot: (downsample = 1) =>
      request<MapSnapshot>(baseUrl, `/api/debug/mapping/map_snapshot?downsample=${downsample}`),
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