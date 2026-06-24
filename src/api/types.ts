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
  mappingStatus?: string;
  nav2Status?: string;
  lastOdomAgeSec?: number;
  lastScanAgeSec?: number;
  pose?: Pose | null;
  velocity?: RobotVelocity | null;
  batteryPercent?: number;
  timestamp: number;
};

export type Pose = { frame: string; x: number; y: number; yaw: number };

export type RobotVelocity = { linear_x: number; angular_z: number };

export type VelocityCommand = {
  linear_x: number;
  angular_z: number;
  duration_ms: number;
};

export type TaskCommand = {
  task: string;
  route_id?: string;
  checkpoint?: string;
  text?: string;
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
  taskStatus?: string;
  systemMode?: string;
  pose?: Pose | null;
  velocity?: RobotVelocity | null;
  mapMeta?: MapMeta | null;
};

export type NavigationGoalRequest = {
  x: number;
  y: number;
  yaw: number;
  label?: string;
};

export type ApiResponse<T> = {
  ok: boolean;
  message?: string | null;
  data?: T | null;
  error?: string | null;
  timestamp?: number;
};

export type ChassisTestRequest = VelocityCommand & {
  mode: 'forward' | 'backward' | 'left' | 'right' | 'stop';
};

export type MappingSaveRequest = {
  map_name?: string;
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
  recommendedNextAction: 'start_bringup' | 'start_mapping' | 'wait_for_map' | 'continue_mapping_or_save' | string;
  process?: ProcessStatus | null;
  lastMapAgeSec?: number | null;
  mapMeta?: MapMeta | null;
};

export type MapSnapshot = {
  map_meta: MapMeta;
  png_base64: string;
};

export type SavedMap = {
  yaml_path: string;
  pgm_path: string;
  output?: string;
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
  | 'no_map';

export type PendingState = {
  status: boolean;
  stop: boolean;
  velocity: boolean;
  task: boolean;
  debug: boolean;
  system: boolean;
  mapping: boolean;
  navigation: boolean;
  copy: boolean;
  route: boolean;
  patrol: boolean;
};

export type ConnectionTestResult = {
  ok: boolean;
  message: string;
  latencyMs?: number;
  timestamp: number;
};

// ===== 路线文件 / 巡逻执行（version=2，与机器人端 route_patrol_*.json 一致）=====

// 路线位姿（map 坐标系，单位米，yaw 弧度）
export type RoutePose = { x: number; y: number; yaw: number };

// 巡检目标点
export type PatrolTarget = {
  id: string;
  name: string;
  pose: RoutePose;
  task_duration_sec?: number;
};

// 巡检路线定义
export type PatrolRoute = {
  id: string;
  name: string;
  target_ids: string[];
  return_to_start: boolean;
  goal_timeout_sec?: number;
  max_retries_per_checkpoint?: number;
  failure_policy?: string;
  loop?: { enabled: boolean; wait_sec?: number; max_cycles?: number };
};

// 路线文件 version=2 完整结构
export type PatrolRouteFileV2 = {
  version: 2;
  frame_id: string;
  active_route_id: string;
  start_pose: {
    name: string;
    pose: RoutePose;
    publish_initial_pose: boolean;
    covariance?: { x: number; y: number; yaw: number };
  };
  targets: PatrolTarget[];
  routes: PatrolRoute[];
  schedules: Array<{
    id: string;
    route_id: string;
    enabled: boolean;
    mode: string;
    period_sec?: number;
  }>;
};

// 地图元信息（GET /api/debug/route/map）
export type PatrolRouteMapInfo = {
  map_name: string;
  resolution: number;
  origin: [number, number, number];
  width: number;
  height: number;
  image_url: string;
};

// 活动路线响应（GET /api/debug/route/active）
export type PatrolRouteActiveResponse = {
  file_name: string;
  file_path: string;
  route: PatrolRouteFileV2;
  validation: { ok: boolean; message?: string };
};

// patrol 状态机 9 态（canceling 为机器人端内部瞬时态，不对外暴露）
export type PatrolState =
  | 'idle'
  | 'running'
  | 'paused'
  | 'waiting_loop'
  | 'returning_home'
  | 'waiting_schedule'
  | 'succeeded'
  | 'failed'
  | 'canceled';

// patrol 运行状态（GET /api/debug/patrol/status）
export type PatrolStatus = {
  state: PatrolState;
  route_id?: string;
  target_id?: string;
  target_index?: number;
  target_count?: number;
  cycle_index?: number;
  loop_wait_sec?: number;
  last_error?: string;
  timestamp: number;
};

// patrol 事件（GET /api/debug/patrol/events 返回数组）
export type PatrolEvent = {
  type:
    | 'initial_pose_published'
    | 'route_started'
    | 'target_reached'
    | 'target_task_finished'
    | 'return_home_started'
    | 'route_finished'
    | 'route_failed';
  route_id?: string;
  target_id?: string;
  target_index?: number;
  message?: string;
  timestamp: number;
};

// patrol 命令（POST /api/debug/patrol/command body）
export type PatrolCommand = {
  command: 'start' | 'pause' | 'resume' | 'cancel' | 'reload' | 'initialize';
  route_id?: string;
};
