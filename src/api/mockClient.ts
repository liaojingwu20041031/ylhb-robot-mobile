import {
  ApiResponse,
  ChassisTestRequest,
  DebugStatus,
  InitialPoseRequest,
  MapSnapshot,
  MappingSaveRequest,
  MappingStatus,
  MockScenario,
  NavigationGoalRequest,
  PatrolCommand,
  PatrolEvent,
  PatrolRouteActiveResponse,
  PatrolRouteFileV2,
  PatrolRouteMapInfo,
  PatrolState,
  PatrolStatus,
  RobotStatus,
  SavedMap,
  SystemStatus,
  TaskCommand,
  VelocityCommand,
} from './types';

const delay = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));

let bringupRunning = true;
let mappingStatus = 'not_running';
let nav2Status = 'not_running';
let scenario: MockScenario = 'normal';

let patrolState: PatrolState = 'idle';
let patrolTargetIndex = 0;
let patrolCycleIndex = 0;
let patrolEvents: PatrolEvent[] = [];

const MOCK_MAP_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';

const MOCK_MAP_META = {
  frame_id: 'map',
  timestamp: Date.now() / 1000,
  resolution: 0.05,
  width: 400,
  height: 300,
  origin: {
    position: { x: -2, y: -3, z: 0 },
    orientation: { x: 0, y: 0, z: 0, w: 1 },
  },
};

const MOCK_ROUTE_FILE: PatrolRouteFileV2 = {
  version: 2,
  frame_id: 'map',
  active_route_id: 'route_patrol_001',
  start_pose: {
    name: '充电点',
    pose: { x: 0, y: 0, yaw: 0 },
    publish_initial_pose: true,
    covariance: { x: 0.05, y: 0.05, yaw: 0.02 },
  },
  targets: [
    { id: 'cp001', name: '1 号巡检点', pose: { x: 1.2, y: 0.5, yaw: 0 }, task_duration_sec: 30 },
    { id: 'cp002', name: '2 号巡检点', pose: { x: 0.5, y: -0.8, yaw: 1.57 }, task_duration_sec: 30 },
    { id: 'cp003', name: '3 号巡检点', pose: { x: -0.8, y: 0.6, yaw: 3.14 }, task_duration_sec: 30 },
    { id: 'cp004', name: '测试点', pose: { x: -0.4, y: 0.9, yaw: 3.14 }, task_duration_sec: 20 },
  ],
  routes: [
    {
      id: 'route_patrol_001',
      name: '主巡检路线',
      target_ids: ['cp001', 'cp002', 'cp003'],
      return_to_start: true,
      goal_timeout_sec: 60,
      max_retries_per_checkpoint: 2,
      failure_policy: 'abort_and_return_home',
      loop: { enabled: true, wait_sec: 5, max_cycles: 0 },
    },
  ],
  schedules: [
    { id: 'sched_001', route_id: 'route_patrol_001', enabled: false, mode: 'interval', period_sec: 300 },
  ],
};

const MOCK_MAP_INFO: PatrolRouteMapInfo = {
  map_name: 'mock_map',
  resolution: 0.05,
  origin: [-2, -3, 0],
  width: 400,
  height: 300,
  image_url: 'mock://grid',
};

function pushEvent(type: PatrolEvent['type'], extra?: Partial<PatrolEvent>) {
  patrolEvents = [{ type, ...extra, timestamp: Date.now() }, ...patrolEvents].slice(0, 50);
}

function patrolTaskStatus(): string {
  if (patrolState === 'running') return '巡检执行中';
  if (patrolState === 'returning_home') return '返航中';
  if (patrolState === 'waiting_loop') return '等待循环';
  if (patrolState === 'waiting_schedule') return '等待调度';
  if (patrolState === 'paused') return '巡逻已暂停';
  if (patrolState === 'failed') return '巡检失败';
  if (patrolState === 'succeeded') return '巡检完成';
  if (patrolState === 'canceled') return '巡逻已取消';
  return 'idle';
}

export function setMockScenario(next: MockScenario) {
  scenario = next;
  bringupRunning = next !== 'chassis_fault';
  mappingStatus = next === 'mapping' || next === 'no_map' ? 'running' : 'not_running';
  nav2Status = 'not_running';
  patrolEvents = [];
  patrolCycleIndex = 0;
  patrolState = 'idle';
  patrolTargetIndex = 0;
}

const systemMode = (): string => {
  if (scenario === 'chassis_fault' || scenario === 'scan_fault') return 'fault';
  if (scenario === 'mapping') return 'mapping';
  return 'ready';
};

const status = (): RobotStatus => ({
  online: scenario !== 'chassis_fault',
  connectionState: 'connected',
  canStatus: scenario === 'chassis_fault' ? 'unknown' : 'online',
  zlacStatus: scenario === 'chassis_fault' ? 'fault' : 'online',
  systemMode: systemMode(),
  taskStatus: patrolTaskStatus(),
  mappingStatus,
  nav2Status,
  lastOdomAgeSec: scenario === 'chassis_fault' ? 8.4 : 0.12,
  lastScanAgeSec: scenario === 'scan_fault' ? 9.8 : 0.09,
  pose: { frame: 'map', x: 1.2, y: -0.4, yaw: 0.18 },
  velocity: { linear_x: 0, angular_z: 0 },
  batteryPercent: 86,
  timestamp: Date.now(),
});

const debugStatus = (): DebugStatus => ({
  online: true,
  topics: {
    '/cmd_vel': true,
    '/odom': scenario !== 'chassis_fault',
    '/scan': scenario !== 'scan_fault',
    '/map': mappingStatus === 'running' && scenario !== 'no_map',
    '/imu/data': scenario !== 'chassis_fault',
  },
  nodes: {
    zlac8015d_canopen_controller: scenario !== 'chassis_fault',
    slam_toolbox: mappingStatus === 'running',
    bt_navigator: nav2Status === 'running',
    controller_server: nav2Status === 'running',
    planner_server: nav2Status === 'running',
    amcl: nav2Status === 'running',
    map_server: nav2Status === 'running',
    patrol_executor: true,
    bringup: bringupRunning,
    rplidar_node: scenario !== 'scan_fault',
    imu: scenario !== 'chassis_fault',
    tf: scenario !== 'chassis_fault',
  },
  lastOdomAgeSec: scenario === 'chassis_fault' ? 8.4 : 0.12,
  lastScanAgeSec: scenario === 'scan_fault' ? 9.8 : 0.09,
  lastMapAgeSec: mappingStatus === 'running' && scenario !== 'no_map' ? 0.6 : null,
  lastImuAgeSec: scenario === 'chassis_fault' ? 8.1 : 0.11,
  scanRangeMin: scenario === 'scan_fault' ? null : 0.18,
  scanRangeMax: scenario === 'scan_fault' ? null : 8.0,
  zlacStatus: scenario === 'chassis_fault' ? 'fault' : 'online',
  mappingStatus,
  nav2Status,
  systemMode: systemMode(),
  taskStatus: patrolTaskStatus(),
  pose: { frame: 'map', x: 1.2, y: -0.4, yaw: 0.18 },
  velocity: { linear_x: 0, angular_z: 0 },
  mapMeta: mappingStatus === 'running' && scenario !== 'no_map' ? MOCK_MAP_META : null,
});

const systemStatus = (): SystemStatus => ({
  bringup: {
    mode: 'bringup',
    command: ['/home/nvidia/ros2_DL/scripts/run_on_jetson.sh', 'bringup'],
    pid: bringupRunning ? 12345 : null,
    started_at: bringupRunning ? Date.now() / 1000 - 520 : null,
    running: bringupRunning,
    returncode: bringupRunning ? null : 0,
    log_path: '/home/nvidia/ros2_DL/logs/mobile_bridge/bringup.log',
    log_tail: bringupRunning ? 'mock bringup ready: /odom /scan /imu/data /tf online' : 'mock bringup stopped',
    managed_by_bridge: true,
  },
  mapping: {
    mode: 'mapping',
    command: mappingStatus === 'running' ? ['/home/nvidia/ros2_DL/scripts/run_on_jetson.sh', 'mapping'] : null,
    pid: mappingStatus === 'running' ? 22345 : null,
    started_at: mappingStatus === 'running' ? Date.now() / 1000 - 120 : null,
    running: mappingStatus === 'running',
    returncode: mappingStatus === 'running' ? null : 0,
    log_path: '/home/nvidia/ros2_DL/logs/mobile_bridge/mapping.log',
    log_tail: mappingStatus === 'running' ? 'mock slam_toolbox active, /map publishing' : 'mock mapping idle',
    managed_by_bridge: mappingStatus === 'running',
  },
});

const mappingDebugStatus = (): MappingStatus => ({
  mappingStatus,
  bringupReady: bringupRunning && scenario !== 'chassis_fault' && scenario !== 'scan_fault',
  mapAvailable: mappingStatus === 'running' && scenario !== 'no_map',
  recommendedNextAction: !bringupRunning ? 'start_bringup' : mappingStatus !== 'running' ? 'start_mapping' : scenario === 'no_map' ? 'wait_for_map' : 'continue_mapping_or_save',
  process: systemStatus().mapping,
  lastMapAgeSec: mappingStatus === 'running' && scenario !== 'no_map' ? 0.6 : null,
  mapMeta: mappingStatus === 'running' && scenario !== 'no_map' ? MOCK_MAP_META : null,
});

const mapSnapshot = (): MapSnapshot => ({
  map_meta: MOCK_MAP_META,
  png_base64: MOCK_MAP_PNG,
});

const ok = async <T>(data?: T, message = 'mock ok'): Promise<ApiResponse<T>> => {
  await delay();
  return { ok: true, message, data, timestamp: Date.now() / 1000 };
};

export const mockRobotClient = {
  getStatus: () => ok(status(), 'mock status refreshed'),
  sendVelocity: (command: VelocityCommand) =>
    ok(null, `mock velocity linear=${command.linear_x} angular=${command.angular_z}`),
  sendTextCommand: (text: string) =>
    ok(null, `mock text command: ${text}`),
  sendTask: (command: TaskCommand) =>
    ok(null, `mock task: ${command.text ?? command.task}`),
  stop: () => ok(null, 'mock emergency stop'),
};

export const mockDebugClient = {
  getSystemStatus: () => ok(systemStatus(), 'mock system status'),
  startBringup: () => {
    bringupRunning = true;
    return ok(null, 'mock bringup started pid=12345');
  },
  stopBringup: () => {
    bringupRunning = false;
    mappingStatus = 'not_running';
    return ok(null, 'mock bringup stopped');
  },
  startMappingProcess: () => {
    mappingStatus = 'running';
    return ok(null, 'mock mapping started pid=22345');
  },
  stopMappingProcess: () => {
    mappingStatus = 'not_running';
    return ok(null, 'mock mapping stopped');
  },
  getDebugStatus: () => ok(debugStatus(), 'mock debug status'),
  chassisTest: (body: ChassisTestRequest) =>
    ok(null, `mock chassis ${body.mode} duration=${body.duration_ms}ms`),
  chassisStop: () => ok(null, 'mock chassis stop'),
  getMappingStatus: () => ok(mappingDebugStatus(), 'mock mapping status'),
  startMapping: () => {
    mappingStatus = 'running';
    if (scenario === 'no_map') {
      scenario = 'mapping';
    }
    return ok(null, 'mock mapping started pid=22345');
  },
  saveMapping: (body: MappingSaveRequest = {}) =>
    ok<SavedMap>(
      {
        yaml_path: `/home/nvidia/ros2_ws/src/${body.map_name ?? 'my_map'}.yaml`,
        pgm_path: `/home/nvidia/ros2_ws/src/${body.map_name ?? 'my_map'}.pgm`,
        output: 'mock map_saver completed',
      },
      'mock map saved',
    ),
  stopMapping: () => {
    mappingStatus = 'not_running';
    return ok(null, 'mock mapping stopped');
  },
  getMapSnapshot: async () => {
    if (scenario === 'no_map' || mappingStatus !== 'running') {
      await delay();
      return { ok: false, error: 'no_map', message: '等待 /map 数据', data: null, timestamp: Date.now() / 1000 };
    }
    return ok(mapSnapshot(), 'mock map snapshot');
  },
  getNavigationStatus: () => ok(debugStatus(), 'mock navigation status'),
  startNavigation: () => {
    nav2Status = 'running';
    return ok(null, 'mock navigation started');
  },
  setInitialPose: (body: InitialPoseRequest) =>
    ok(null, `mock initial pose x=${body.x} y=${body.y} yaw=${body.yaw}`),
  sendNavigationGoal: (body: NavigationGoalRequest) =>
    ok({ accepted: true }, `mock goal accepted: ${body.label ?? `${body.x},${body.y}`}`),
  cancelNavigation: () => ok(null, 'mock navigation canceled'),
};

export const mockRouteClient = {
  getRouteMap: () => ok(MOCK_MAP_INFO, 'mock route map'),
  getRouteMapImageUrl: () => 'mock://grid',
  getActiveRoute: () =>
    ok<PatrolRouteActiveResponse>(
      {
        file_name: 'route_patrol_001.json',
        file_path: '/home/nvidia/ros2_DL/maps/route_patrol_001.json',
        route: MOCK_ROUTE_FILE,
        validation: { ok: true, message: 'route file valid' },
      },
      'mock active route',
    ),
};

export const mockPatrolClient = {
  getPatrolStatus: () =>
    ok<PatrolStatus>(
      {
        state: patrolState,
        route_id: 'route_patrol_001',
        target_id: MOCK_ROUTE_FILE.targets[patrolTargetIndex]?.id,
        target_index: patrolTargetIndex,
        target_count: 3,
        cycle_index: patrolCycleIndex,
        loop_wait_sec: 5,
        last_error: patrolState === 'failed' ? '目标点 cp002 导航超时' : undefined,
        timestamp: Date.now(),
      },
      'mock patrol status',
    ),
  getPatrolEvents: () => ok(patrolEvents, 'mock patrol events'),
  startPatrolProcess: () => ok(null, 'mock patrol_executor_node started'),
  sendPatrolCommand: (body: PatrolCommand) => {
    switch (body.command) {
      case 'start':
        patrolState = 'running';
        patrolTargetIndex = 0;
        patrolCycleIndex = 0;
        pushEvent('initial_pose_published');
        pushEvent('route_started', { route_id: body.route_id ?? 'route_patrol_001' });
        break;
      case 'pause':
        patrolState = 'paused';
        break;
      case 'resume':
        patrolState = 'running';
        pushEvent('route_started', { message: 'resumed' });
        break;
      case 'cancel':
        patrolState = 'canceled';
        pushEvent('route_failed', { message: 'canceled by user' });
        break;
      case 'reload':
        patrolState = 'idle';
        patrolTargetIndex = 0;
        pushEvent('route_started', { message: 'route file reloaded' });
        break;
      case 'initialize':
        pushEvent('initial_pose_published', { message: 'initial pose re-published' });
        break;
    }
    return ok(null, `mock patrol ${body.command}`);
  },
};
