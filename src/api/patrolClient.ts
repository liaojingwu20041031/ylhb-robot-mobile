import { request } from './http';
import { ApiResponse, PatrolCommand, PatrolEvent, PatrolStatus } from './types';

export function createPatrolClient(baseUrl: string) {
  return {
    // GET /api/debug/patrol/status — 本地巡逻状态机当前状态
    getPatrolStatus: () => request<PatrolStatus>(baseUrl, '/api/debug/patrol/status'),
    // GET /api/debug/patrol/events — 最近 N 条巡逻事件
    getPatrolEvents: () => request<PatrolEvent[]>(baseUrl, '/api/debug/patrol/events'),
    // POST /api/debug/patrol/start_process — 启动 patrol_executor_node 进程
    startPatrolProcess: () =>
      request<null>(baseUrl, '/api/debug/patrol/start_process', { method: 'POST' }),
    // POST /api/debug/patrol/command — 巡逻控制命令（start/pause/resume/cancel/reload/initialize）
    sendPatrolCommand: (body: PatrolCommand) =>
      request<null>(baseUrl, '/api/debug/patrol/command', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  };
}

export type PatrolClient = ReturnType<typeof createPatrolClient>;

export type { ApiResponse };
