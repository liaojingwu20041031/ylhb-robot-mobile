import {
  AppLog,
  DebugStatus,
  MappingStatus,
  RobotStatus,
  StatusSource,
  SystemStatus,
} from '../api/types';
import { ConsoleTone } from '../theme/consoleTheme';
import { booleanStateText, connectionStateText, mappingStateText, navigationStateText, processStateText, statusSourceText } from './displayText';

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
    tips.push('机器人服务未在线：请检查服务地址、网络连接和 mobile_bridge。');
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
  return tips;
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
    '机器人控制中心状态报告',
    `时间：${new Date().toLocaleString()}`,
    `状态来源：${statusSourceText(source)}`,
    `机器人连接：${connectionStateText(status.connectionState)}`,
    `底盘电机驱动（ZLAC）：${processStateText(status.zlacStatus ?? debugStatus?.zlacStatus)}`,
    `底盘通信总线（CAN）：${processStateText(status.canStatus)}`,
    `运动指令通道（/cmd_vel）：${booleanStateText(debugStatus?.topics?.['/cmd_vel'])}`,
    `/odom：${freshnessLabel(status.lastOdomAgeSec ?? debugStatus?.lastOdomAgeSec)}`,
    `/scan：${freshnessLabel(status.lastScanAgeSec ?? debugStatus?.lastScanAgeSec)}`,
    `/imu/data：${freshnessLabel(debugStatus?.lastImuAgeSec)}`,
    `坐标变换（TF）：${booleanStateText(debugStatus?.nodes?.tf)}`,
    `基础驱动（bringup）：${processStateText(systemStatus?.bringup?.running)}`,
    `建图服务（mapping）：${processStateText(systemStatus?.mapping?.running)}`,
    `建图引擎（slam_toolbox）：${booleanStateText(debugStatus?.nodes?.slam_toolbox)}`,
    `地图数据（/map）：${booleanStateText(debugStatus?.topics?.['/map'])}`,
    `导航系统（Nav2）：${navigationStateText(status.nav2Status ?? debugStatus?.nav2Status)}`,
    `建图状态（mappingStatus）：${mappingStateText(mappingStatus?.mappingStatus ?? status.mappingStatus)}`,
  ];
  return lines.join('\n');
}
