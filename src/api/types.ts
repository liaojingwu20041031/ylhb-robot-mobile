export type RobotConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

export type Pose = { frame: string; x: number; y: number; yaw: number };

export type RobotVelocity = { linear_x: number; angular_z: number };

export type RobotStatus = {
  online: boolean;
  connectionState: RobotConnectionState;
  canStatus?: string;
  zlacStatus?: string;
  systemMode?: string;
  mappingStatus?: string;
  nav2Status?: string;
  lastOdomAgeSec?: number;
  lastScanAgeSec?: number;
  pose?: Pose | null;
  velocity?: RobotVelocity | null;
  batteryPercent?: number;
  timestamp: number;
};

export type VelocityCommand = {
  linear_x?: number;
  angular_z?: number;
  duration_ms?: number;
};

export type ApiResponse<T> = {
  ok: boolean;
  message?: string | null;
  data?: T | null;
  error?: string | null;
  timestamp?: number;
};

export type DebugStatus = {
  online: boolean;
  topics: Record<string, boolean>;
  nodes: Record<string, boolean>;
  lastOdomAgeSec?: number;
  lastScanAgeSec?: number;
  lastMapAgeSec?: number | null;
  lastImuAgeSec?: number | null;
  scanRangeMin?: number | null;
  scanRangeMax?: number | null;
  zlacStatus?: string;
  mappingStatus?: string;
  nav2Status?: string;
  systemMode?: string;
  pose?: Pose | null;
  velocity?: RobotVelocity | null;
  mapMeta?: MapMeta | null;
};

export type ProcessMode = 'bringup' | 'mapping';

export type ProcessStatus = {
  mode: ProcessMode;
  command: string[] | null;
  pid: number | null;
  started_at: number | null;
  running: boolean;
  returncode: number | null;
  log_path: string | null;
  log_tail: string;
  managed_by_bridge: boolean;
};

export type SystemStatus = {
  bringup: ProcessStatus;
  mapping: ProcessStatus;
};

export type MapMeta = {
  frame_id: string;
  timestamp: number;
  resolution: number;
  width: number;
  height: number;
  origin: {
    position: { x: number; y: number; z: number };
    orientation: { x: number; y: number; z: number; w: number };
  };
};

export type MappingStatus = {
  mappingStatus: 'running' | 'not_running' | string;
  bringupReady: boolean;
  mapAvailable: boolean;
  recommendedNextAction:
    | 'start_bringup'
    | 'start_mapping'
    | 'wait_for_map'
    | 'continue_mapping_or_save'
    | string;
  process?: ProcessStatus | null;
  lastMapAgeSec?: number | null;
  mapMeta?: MapMeta | null;
};

export type MapSnapshot = {
  map_meta: MapMeta;
  png_base64: string;
};

export type MappingSaveRequest = {
  map_name?: string;
};

export type SavedMap = {
  yaml_path: string;
  pgm_path: string;
  output?: string;
};

export type AppLogType = 'info' | 'warn' | 'error' | 'api' | 'debug' | 'user';

export type AppLog = {
  id: string;
  type: AppLogType;
  message: string;
  detail?: string;
  source?: string;
  timestamp: number;
};

export type StatusSource = 'WebSocket' | 'HTTP fallback' | '未知';

export type MapSource = 'ws' | 'http' | 'none';

export type PendingState = {
  connectPending: boolean;
  statusPending: boolean;
  controlPending: boolean;
  systemPending: boolean;
  mappingStatusPending: boolean;
  mapSnapshotPending: boolean;
  mapSavePending: boolean;
  copyPending: boolean;
};

export type ConnectionTestResult = {
  ok: boolean;
  message: string;
  latencyMs?: number;
  timestamp: number;
};
