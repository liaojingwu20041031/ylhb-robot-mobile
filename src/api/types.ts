export type RobotConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

export type RobotStatus = {
  online: boolean;
  connectionState: RobotConnectionState;
  canStatus?: string;
  zlacStatus?: string;
  systemMode?: string;
  taskStatus?: string;
  salesDialogueStatus?: string;
  cart?: string;
  mappingStatus?: string;
  nav2Status?: string;
  lastOdomAgeSec?: number;
  lastScanAgeSec?: number;
  batteryPercent?: number;
  timestamp: number;
};

export type VelocityCommand = {
  linear_x: number;
  angular_z: number;
  duration_ms: number;
};

export type TaskCommand = {
  task: string;
  product?: string;
  target?: string;
  text?: string;
};

export type DebugStatus = {
  online: boolean;
  topics: Record<string, boolean>;
  nodes: Record<string, boolean>;
  lastOdomAgeSec?: number;
  lastScanAgeSec?: number;
  lastMapAgeSec?: number;
  scanRangeMin?: number;
  scanRangeMax?: number;
  zlacStatus?: string;
  mappingStatus?: string;
  nav2Status?: string;
  taskStatus?: string;
  systemMode?: string;
  salesDialogueStatus?: string;
  cart?: string;
};

export type NavigationGoalRequest = {
  x: number;
  y: number;
  yaw: number;
  label?: string;
};

export type ApiResponse<T> = {
  ok: boolean;
  message?: string;
  data?: T;
  error?: string;
};

export type ChassisTestRequest = VelocityCommand & {
  mode: 'forward' | 'backward' | 'left' | 'right' | 'stop';
};

export type MappingSaveRequest = {
  map_name?: string;
};

export type InitialPoseRequest = {
  x: number;
  y: number;
  yaw: number;
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

export type StatusSource = 'Mock' | 'WebSocket' | 'HTTP Polling' | '未知';

export type MockScenario =
  | 'normal'
  | 'scan_fault'
  | 'chassis_fault'
  | 'mapping'
  | 'navigation'
  | 'task_running';

export type PendingState = {
  status: boolean;
  stop: boolean;
  velocity: boolean;
  task: boolean;
  debug: boolean;
  mapping: boolean;
  navigation: boolean;
  copy: boolean;
};

export type ConnectionTestResult = {
  ok: boolean;
  message: string;
  latencyMs?: number;
  timestamp: number;
};
