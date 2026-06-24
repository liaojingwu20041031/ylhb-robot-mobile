import { request, trimBaseUrl } from './http';
import { ApiResponse, PatrolRouteActiveResponse, PatrolRouteMapInfo } from './types';

export function createRouteClient(baseUrl: string) {
  return {
    // GET /api/debug/route/map — 当前地图元信息
    getRouteMap: () => request<PatrolRouteMapInfo>(baseUrl, '/api/debug/route/map'),
    // 地图图片 URL（非异步，供 RouteMapPanel 的 <Image href> 直接使用）
    getRouteMapImageUrl: () => `${trimBaseUrl(baseUrl)}/api/debug/route/map/image`,
    // GET /api/debug/route/active — 当前生效的 route_patrol_*.json
    getActiveRoute: () =>
      request<PatrolRouteActiveResponse>(baseUrl, '/api/debug/route/active'),
  };
}

export type RouteClient = ReturnType<typeof createRouteClient>;

// 仅用于 RouteMapPanel 拼接真实图片 URL（mock 模式不调用）
export function resolveRouteMapImageUrl(baseUrl: string): string {
  return `${trimBaseUrl(baseUrl)}/api/debug/route/map/image`;
}

export type { ApiResponse };
