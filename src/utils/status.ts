import {
  AppLog,
  DebugStatus,
  PatrolEvent,
  PatrolRouteActiveResponse,
  PatrolState,
  PatrolStatus,
  RobotStatus,
} from '../api/types';
import { ConsoleTone } from '../theme/consoleTheme';

export function textOrUnknown(value?: string | number | boolean | null) {
  if (value === undefined || value === null || value === '') {
    return '未知';
  }
  if (typeof value === 'boolean') {
    return value ? '正常' : '异常';
  }
  return String(value);
}

export function freshnessLabel(age?: number) {
  if (age === undefined || age === null || Number.isNaN(age)) {
    return '无数据';
  }
  if (age > 3) {
    return '过期';
  }
  return `${age.toFixed(1)}s 前`;
}

export function freshnessTone(age?: number): ConsoleTone {
  if (age === undefined || age === null || Number.isNaN(age)) {
    return 'stale';
  }
  if (age > 3) {
    return 'danger';
  }
  if (age > 1) {
    return 'warning';
  }
  return 'success';
}

export function stateTone(value?: string | boolean | null): ConsoleTone {
  if (typeof value === 'boolean') {
    return value ? 'success' : 'danger';
  }
  const normalized = String(value ?? '').toLowerCase();
  if (!normalized || normalized === 'unknown') {
    return 'neutral';
  }
  if (/(error|fault|danger|failed|disconnected|故障|危险|断开)/.test(normalized)) {
    return 'danger';
  }
  if (/(warn|stale|not_running|missing|不可用|过期|警告|未启动)/.test(normalized)) {
    return 'warning';
  }
  if (/(running|connecting|mapping|navigation|执行|运行|建图|导航)/.test(normalized)) {
    return 'info';
  }
  if (/(ok|ready|online|connected|idle|normal|success|正常|就绪|可用)/.test(normalized)) {
    return 'success';
  }
  return 'neutral';
}

export function buildDiagnostics(status: RobotStatus, debugStatus?: DebugStatus) {
  const tips: string[] = [];
  if (status.lastScanAgeSec === undefined || status.lastScanAgeSec > 3 || debugStatus?.topics?.['/scan'] === false) {
    tips.push('/scan 无数据：检查雷达串口、供电和 rplidar_node。');
  }
  if (status.lastOdomAgeSec === undefined || status.lastOdomAgeSec > 3 || debugStatus?.topics?.['/odom'] === false) {
    tips.push('/odom 无数据：检查 ZLAC、can1、驱动节点和 EKF。');
  }
  if (debugStatus?.topics?.['/map'] === false || status.mappingStatus === 'not_running') {
    tips.push('地图不存在或未发布：启动 mapping 后等待 /map，再保存地图。');
  }
  return tips.length ? tips : ['底盘调试前置条件可用，可以继续低速点动或建图测试。'];
}

export function buildNextStep(status: RobotStatus, debugStatus?: DebugStatus) {
  const scanOk = status.lastScanAgeSec !== undefined && status.lastScanAgeSec <= 1;
  const odomOk = status.lastOdomAgeSec !== undefined && status.lastOdomAgeSec <= 1;
  const hasMap = Boolean(debugStatus?.topics?.['/map']);
  if (!status.online) {
    return '先确认 Jetson bridge 地址与网络连接，再刷新状态。';
  }
  if (!scanOk || !odomOk) {
    return '先修复 /scan 与 /odom 数据新鲜度，再进行底盘点动或建图。';
  }
  if (!hasMap) {
    return '/scan 和 /odom 正常，可以启动建图；no_map 时等待 /map 数据后再保存。';
  }
  return '地图数据已具备，可以继续建图或保存地图。';
}

export function formatLogs(logs: AppLog[]) {
  return logs
    .map((log) => {
      const time = new Date(log.timestamp).toLocaleString();
      return `[${time}] [${log.type.toUpperCase()}] ${log.source ?? 'APP'} - ${log.message}${log.detail ? `\n${log.detail}` : ''}`;
    })
    .join('\n');
}

export function buildStatusReport(
  status: RobotStatus,
  debugStatus: DebugStatus | undefined,
  source: string,
  mockMode: boolean,
  patrolStatus?: PatrolStatus,
  activeRoute?: PatrolRouteActiveResponse,
) {
  const lines = [
    '电力巡检机器人状态报告',
    `时间：${new Date().toLocaleString()}`,
    `模式：${mockMode ? 'Mock Mode' : 'Real Robot Mode'}`,
    `状态来源：${source}`,
    `Bridge：${textOrUnknown(status.connectionState)}`,
    `ZLAC：${textOrUnknown(status.zlacStatus)}`,
    `CAN：${textOrUnknown(status.canStatus)}`,
    `/odom：${freshnessLabel(status.lastOdomAgeSec)}`,
    `/scan：${freshnessLabel(status.lastScanAgeSec)}`,
    `system_mode：${textOrUnknown(status.systemMode)}`,
    `task_status：${textOrUnknown(status.taskStatus)}`,
    `mapping：${textOrUnknown(status.mappingStatus)}`,
    `/map：${debugStatus?.topics?.['/map'] === undefined ? '未知' : debugStatus.topics['/map'] ? '可用' : '不可用'}`,
    `/imu/data：${debugStatus?.topics?.['/imu/data'] === undefined ? '未知' : debugStatus.topics['/imu/data'] ? '可用' : '不可用'}`,
    `TF：${debugStatus?.nodes?.tf === undefined ? '未知' : debugStatus.nodes.tf ? '可用' : '不可用'}`,
    `底盘可控：${Boolean(debugStatus?.topics?.['/odom'] && debugStatus?.topics?.['/scan'] && debugStatus?.topics?.['/imu/data'] && debugStatus?.nodes?.tf) ? '前置条件满足' : '锁定'}`,
  ];
  return lines.join('\n');
}

// ===== Patrol / Route 辅助 =====

export const patrolStateLabel: Record<PatrolState, string> = {
  idle: '空闲',
  running: '执行中',
  paused: '已暂停',
  waiting_loop: '等待循环',
  returning_home: '返航中',
  waiting_schedule: '等待调度',
  succeeded: '已完成',
  failed: '失败',
  canceled: '已取消',
};

export const patrolEventLabel: Record<PatrolEvent['type'], string> = {
  initial_pose_published: '初始位姿已发布',
  route_started: '路线已启动',
  target_reached: '到达目标点',
  target_task_finished: '目标点任务完成',
  return_home_started: '开始返航',
  route_finished: '路线完成',
  route_failed: '路线失败',
};

export function patrolStateTone(state?: PatrolState): ConsoleTone {
  if (!state) return 'neutral';
  if (state === 'failed') return 'danger';
  if (state === 'running' || state === 'returning_home' || state === 'waiting_loop' || state === 'waiting_schedule') {
    return 'info';
  }
  if (state === 'idle' || state === 'succeeded') return 'success';
  return 'warning'; // paused / canceled
}

// 路线摘要文本（供日志复制）
export function buildRouteSummary(active?: PatrolRouteActiveResponse): string {
  if (!active) return '未加载路线文件';
  const route = active.route.routes.find((r) => r.id === active.route.active_route_id);
  const scheduleEnabled = active.route.schedules.some((s) => s.enabled);
  const lines = [
    `路线文件：${active.file_name}`,
    `file_path：${active.file_path}`,
    `active_route_id：${active.route.active_route_id}`,
    `route.name：${route?.name ?? '未找到活动路线'}`,
    `target_count：${route?.target_ids.length ?? 0}`,
    `return_to_start：${route?.return_to_start ?? '未知'}`,
    `loop.enabled：${route?.loop?.enabled ?? false}`,
    `loop.wait_sec：${route?.loop?.wait_sec ?? '-'}`,
    `loop.max_cycles：${route?.loop?.max_cycles ?? '-'}`,
    `schedule.enabled：${scheduleEnabled}`,
    `validation：${active.validation.ok ? '通过' : '失败'}${active.validation.message ? `（${active.validation.message}）` : ''}`,
  ];
  return lines.join('\n');
}

// 巡逻事件摘要文本（供日志复制）
export function buildPatrolEventsSummary(events: PatrolEvent[]): string {
  if (!events.length) return '无巡逻事件';
  return events
    .map((event) => {
      const time = new Date(event.timestamp).toLocaleString();
      const label = patrolEventLabel[event.type] ?? event.type;
      const target = event.target_id ? ` target=${event.target_id}` : '';
      const index = event.target_index !== undefined ? ` idx=${event.target_index}` : '';
      const route = event.route_id ? ` route=${event.route_id}` : '';
      const msg = event.message ? ` ${event.message}` : '';
      return `[${time}] ${label}${route}${target}${index}${msg}`;
    })
    .join('\n');
}
