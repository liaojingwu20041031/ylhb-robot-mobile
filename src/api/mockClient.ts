import {
  ApiResponse,
  ChassisTestRequest,
  DebugStatus,
  InitialPoseRequest,
  MappingSaveRequest,
  NavigationGoalRequest,
  RobotStatus,
  TaskCommand,
  VelocityCommand,
} from './types';

const delay = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));

let mappingStatus = 'not_running';
let nav2Status = 'not_running';
let taskStatus = 'idle';

const status = (): RobotStatus => ({
  online: true,
  connectionState: 'connected',
  canStatus: 'mock_online',
  zlacStatus: 'mock_ready',
  taskStatus,
  mappingStatus,
  nav2Status,
  lastOdomAgeSec: 0.12,
  lastScanAgeSec: 0.09,
  batteryPercent: 86,
  timestamp: Date.now(),
});

const debugStatus = (): DebugStatus => ({
  online: true,
  topics: {
    '/cmd_vel': true,
    '/odom': true,
    '/scan': true,
    '/map': mappingStatus === 'running' || nav2Status === 'running',
  },
  nodes: {
    zlac8015d_canopen_controller: true,
    slam_toolbox: mappingStatus === 'running',
    bt_navigator: nav2Status === 'running',
    controller_server: nav2Status === 'running',
    planner_server: nav2Status === 'running',
    amcl: nav2Status === 'running',
    map_server: nav2Status === 'running',
  },
  lastOdomAgeSec: 0.12,
  lastScanAgeSec: 0.09,
  zlacStatus: 'mock_ready',
  mappingStatus,
  nav2Status,
});

const ok = async <T>(data?: T, message = 'mock ok'): Promise<ApiResponse<T>> => {
  await delay();
  return { ok: true, message, data };
};

export const mockRobotClient = {
  getStatus: () => ok(status(), 'mock status refreshed'),
  sendVelocity: (command: VelocityCommand) =>
    ok(null, `mock velocity linear=${command.linear_x} angular=${command.angular_z}`),
  sendTextCommand: (text: string) => {
    taskStatus = text;
    return ok(null, `mock text command: ${text}`);
  },
  sendTask: (command: TaskCommand) => {
    taskStatus = command.text ?? command.task;
    return ok(null, `mock task: ${taskStatus}`);
  },
  stop: () => {
    taskStatus = 'stopped';
    return ok(null, 'mock emergency stop');
  },
};

export const mockDebugClient = {
  getDebugStatus: () => ok(debugStatus(), 'mock debug status'),
  chassisTest: (body: ChassisTestRequest) =>
    ok(null, `mock chassis ${body.mode} duration=${body.duration_ms}ms`),
  chassisStop: () => ok(null, 'mock chassis stop'),
  getMappingStatus: () => ok(debugStatus(), 'mock mapping status'),
  startMapping: () => {
    mappingStatus = 'running';
    return ok(null, 'mock mapping started');
  },
  saveMapping: (body: MappingSaveRequest = {}) =>
    ok(
      {
        yaml_path: `/home/nvidia/ros2_ws/src/${body.map_name ?? 'my_map'}.yaml`,
        pgm_path: `/home/nvidia/ros2_ws/src/${body.map_name ?? 'my_map'}.pgm`,
      },
      'mock map saved',
    ),
  stopMapping: () => {
    mappingStatus = 'not_running';
    return ok(null, 'mock mapping stopped');
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
