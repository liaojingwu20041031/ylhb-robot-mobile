import { MapSource, RobotConnectionState, StatusSource } from '../api/types';

export function connectionStateText(value?: RobotConnectionState | string | null) {
  const labels: Record<string, string> = {
    connected: '已连接',
    connecting: '正在连接',
    disconnected: '未连接',
    error: '连接异常',
  };
  return labels[String(value ?? '').toLowerCase()] ?? '未连接';
}

export function statusSourceText(value?: StatusSource | string | null) {
  const labels: Record<string, string> = {
    WebSocket: '实时连接',
    'HTTP fallback': '轮询连接',
    unknown: '未连接',
    '未知': '未连接',
  };
  return labels[String(value ?? '')] ?? '未连接';
}

export function booleanStateText(value?: boolean | null) {
  if (value === undefined || value === null) return '未知';
  return value ? '正常' : '异常';
}

export function processStateText(value?: boolean | string | null) {
  if (typeof value === 'boolean') return value ? '运行中' : '未运行';
  const labels: Record<string, string> = {
    running: '运行中',
    not_running: '未运行',
    idle: '空闲',
    ready: '已就绪',
    failed: '失败',
  };
  return labels[String(value ?? '').toLowerCase()] ?? (value ? String(value) : '未知');
}

export function mappingStateText(value?: string | null) {
  const labels: Record<string, string> = {
    running: '建图中',
    mapping: '建图中',
    not_running: '未开始',
    idle: '未开始',
    ready: '已就绪',
    failed: '建图失败',
  };
  return labels[String(value ?? '').toLowerCase()] ?? (value ? String(value) : '未知');
}

export function navigationStateText(value?: string | null) {
  const labels: Record<string, string> = {
    running: '导航中',
    navigation: '导航中',
    not_running: '未运行',
    idle: '空闲',
    ready: '已就绪',
    failed: '导航失败',
  };
  return labels[String(value ?? '').toLowerCase()] ?? (value ? String(value) : '未知');
}

export function topicDisplayName(value: string) {
  const labels: Record<string, string> = {
    '/cmd_vel': '运动指令通道',
    '/odom': '里程计',
    '/scan': '激光雷达',
    '/imu/data': '姿态传感器',
    '/map': '地图数据',
  };
  return labels[value] ?? value;
}

export function nodeDisplayName(value: string) {
  const labels: Record<string, string> = {
    ZLAC: '底盘电机驱动',
    CAN: '底盘通信总线',
    TF: '坐标变换',
    tf: '坐标变换',
    bringup: '基础驱动',
    mapping: '建图服务',
    slam_toolbox: '建图引擎',
    Nav2: '导航系统',
  };
  return labels[value] ?? value;
}

export function errorDisplayText(value?: string | null) {
  if (!value) return '操作未完成，请稍后重试。';
  const normalized = value.toLowerCase();
  if (normalized.includes('timeout')) return '连接超时，请检查机器人网络。';
  if (normalized.includes('network') || normalized.includes('fetch')) return '无法连接机器人服务。';
  if (normalized.includes('no_map')) return '当前还没有可用地图。';
  return value;
}

export function mapSourceText(value?: MapSource | null) {
  if (value === 'ws') return '实时更新';
  if (value === 'http') return '轮询更新';
  return '等待地图';
}

export function maskRobotAddress(value: string) {
  try {
    const url = new URL(value);
    const parts = url.hostname.split('.');
    const host = parts.length === 4 ? `${parts[0]}.${parts[1]}.*.*` : url.hostname;
    return `${url.protocol}//${host}${url.port ? `:${url.port}` : ''}`;
  } catch {
    return value.replace(/(\d+\.\d+)\.\d+\.\d+/, '$1.*.*');
  }
}

export function displayState(value?: string | number | boolean | null) {
  if (typeof value === 'boolean') return booleanStateText(value);
  const normalized = String(value ?? '').toLowerCase();
  if (['connected', 'connecting', 'disconnected', 'error'].includes(normalized)) return connectionStateText(normalized);
  if (['running', 'not_running', 'idle', 'ready', 'failed'].includes(normalized)) return processStateText(normalized);
  if (!normalized || normalized === 'unknown' || normalized === '未知') return '未知';
  return String(value);
}
