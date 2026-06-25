import {
  AppLog,
  DebugStatus,
  MappingStatus,
  RobotStatus,
  StatusSource,
  SystemStatus,
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

export function freshnessLabel(age?: number | null) {
  if (age === undefined || age === null || Number.isNaN(age)) {
    return '无数据';
  }
  if (age > 3) {
    return '过期';
  }
  return `${age.toFixed(1)}s 前`;
}

export function freshnessTone(age?: number | null): ConsoleTone {
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
  if (!normalized || normalized === 'unknown' || normalized === '未知') {
    return 'neutral';
  }
  if (/(error|fault|danger|failed|disconnected|故障|危险|断开|失败)/.test(normalized)) {
    return 'danger';
  }
  if (/(warn|stale|not_running|missing|不可用|过期|警告|未启动|离线)/.test(normalized)) {
    return 'warning';
  }
  if (/(running|connecting|mapping|navigation|执行|运行|建图|导航|fallback)/.test(normalized)) {
    return 'info';
  }
  if (/(ok|ready|online|connected|idle|normal|success|正常|就绪|可用|成功)/.test(normalized)) {
    return 'success';
  }
  return 'neutral';
}

export function topicOk(debugStatus: DebugStatus | undefined, name: string) {
  return Boolean(debugStatus?.topics?.[name]);
}

export function nodeOk(debugStatus: DebugStatus | undefined, name: string) {
  return Boolean(debugStatus?.nodes?.[name]);
}

export function buildDiagnostics(status: RobotStatus, debugStatus?: DebugStatus) {
  const tips: string[] = [];
  if (!status.online) {
    tips.push('Bridge 未在线：先检查 Jetson Base URL、热点网段和 ylhb_mobile_bridge。');
  }
  if (status.lastOdomAgeSec === undefined || status.lastOdomAgeSec > 3 || debugStatus?.topics?.['/odom'] === false) {
    tips.push('/odom 无数据：检查 ZLAC、can1、驱动节点和底层 bringup。');
  }
  if (status.lastScanAgeSec === undefined || status.lastScanAgeSec > 3 || debugStatus?.topics?.['/scan'] === false) {
    tips.push('/scan 无数据：检查雷达串口、供电和 rplidar_node。');
  }
  if (debugStatus?.nodes?.tf === false) {
    tips.push('TF 不可用：建图前需要确认 odom、base_link、laser 等坐标变换。');
  }
  if (debugStatus?.topics?.['/map'] === false || status.mappingStatus === 'not_running') {
    tips.push('地图不存在或未发布：启动 mapping 后等待 /map，再保存地图。');
  }
  return tips.length ? tips : ['真实调试链路状态正常，可以继续低速点动或建图测试。'];
}

export function buildNextStep(status: RobotStatus, debugStatus?: DebugStatus) {
  const cmdVelOk = topicOk(debugStatus, '/cmd_vel');
  const scanOk = status.lastScanAgeSec !== undefined && status.lastScanAgeSec <= 1;
  const odomOk = status.lastOdomAgeSec !== undefined && status.lastOdomAgeSec <= 1;
  const tfOk = nodeOk(debugStatus, 'tf');
  const hasMap = topicOk(debugStatus, '/map');
  if (!status.online) {
    return '先连接 Jetson bridge，再读取真实状态接口。';
  }
  if (!cmdVelOk) {
    return 'Bridge 已连接，先确认 /cmd_vel 是否存在；架空测试只要求 connected + /cmd_vel。';
  }
  if (!odomOk) {
    return '/cmd_vel 可用但 /odom 不新鲜，地面低速前先修复底盘里程计。';
  }
  if (!scanOk || !tfOk) {
    return '/odom 可用，可以低速点动；建图前继续确认 /scan 和 TF。';
  }
  if (!hasMap) {
    return '/odom、/scan、TF 正常，可以进入建图页启动 mapping 并观察地图增长。';
  }
  return '地图数据已具备，可以继续低速移动建图或保存地图。';
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
  systemStatus: SystemStatus | undefined,
  mappingStatus: MappingStatus | undefined,
  source: StatusSource,
) {
  const lines = [
    '智能机器人调试台状态报告',
    `时间：${new Date().toLocaleString()}`,
    `状态来源：${source}`,
    `Bridge：${textOrUnknown(status.connectionState)}`,
    `ZLAC：${textOrUnknown(status.zlacStatus ?? debugStatus?.zlacStatus)}`,
    `CAN：${textOrUnknown(status.canStatus)}`,
    `/cmd_vel：${textOrUnknown(debugStatus?.topics?.['/cmd_vel'])}`,
    `/odom：${freshnessLabel(status.lastOdomAgeSec ?? debugStatus?.lastOdomAgeSec)}`,
    `/scan：${freshnessLabel(status.lastScanAgeSec ?? debugStatus?.lastScanAgeSec)}`,
    `/imu/data：${freshnessLabel(debugStatus?.lastImuAgeSec)}`,
    `TF：${textOrUnknown(debugStatus?.nodes?.tf)}`,
    `底层进程（bringup）：${textOrUnknown(systemStatus?.bringup?.running)}`,
    `建图进程（mapping）：${textOrUnknown(systemStatus?.mapping?.running)}`,
    `slam_toolbox：${textOrUnknown(debugStatus?.nodes?.slam_toolbox)}`,
    `/map：${textOrUnknown(debugStatus?.topics?.['/map'])}`,
    `Nav2：${textOrUnknown(status.nav2Status ?? debugStatus?.nav2Status)}`,
    `建图状态（mappingStatus）：${textOrUnknown(mappingStatus?.mappingStatus ?? status.mappingStatus)}`,
  ];
  return lines.join('\n');
}
