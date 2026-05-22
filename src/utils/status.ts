import { AppLog, DebugStatus, RobotStatus } from '../api/types';
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
    tips.push('地图不存在或未发布：先完成建图并保存 my_map。');
  }
  if (status.nav2Status === undefined || /not_running|unknown|error/i.test(status.nav2Status)) {
    tips.push('Nav2 未启动：导航前先启动导航栈并确认 AMCL 初始位姿。');
  }
  return tips.length ? tips : ['关键链路看起来可用，可以按验收步骤继续测试。'];
}

export function buildNextStep(status: RobotStatus, debugStatus?: DebugStatus) {
  const scanOk = status.lastScanAgeSec !== undefined && status.lastScanAgeSec <= 1;
  const odomOk = status.lastOdomAgeSec !== undefined && status.lastOdomAgeSec <= 1;
  const hasMap = Boolean(debugStatus?.topics?.['/map']) || status.mappingStatus === 'running' || status.nav2Status === 'running';
  if (!status.online) {
    return '先确认 Jetson bridge 地址与网络连接，再刷新状态。';
  }
  if (!scanOk || !odomOk) {
    return '先修复 /scan 与 /odom 数据新鲜度，再进行建图或导航。';
  }
  if (!hasMap) {
    return '/scan 和 /odom 正常，可以启动建图；地图不存在时请先保存 my_map。';
  }
  if (status.nav2Status !== 'running') {
    return '地图已具备，可以启动导航并设置初始位姿。';
  }
  return '导航链路已运行，可以进行低速目标点或零售任务验收。';
}

export function formatLogs(logs: AppLog[]) {
  return logs
    .map((log) => {
      const time = new Date(log.timestamp).toLocaleString();
      return `[${time}] [${log.type.toUpperCase()}] ${log.source ?? 'APP'} - ${log.message}${log.detail ? `\n${log.detail}` : ''}`;
    })
    .join('\n');
}

export function buildStatusReport(status: RobotStatus, debugStatus: DebugStatus | undefined, source: string, mockMode: boolean) {
  const lines = [
    'YLHB 智慧零售机器人状态报告',
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
    `navigation：${textOrUnknown(status.nav2Status)}`,
    `/map：${debugStatus?.topics?.['/map'] === undefined ? '未知' : debugStatus.topics['/map'] ? '可用' : '不可用'}`,
  ];
  return lines.join('\n');
}
