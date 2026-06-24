import { PatrolRouteMapInfo } from '../api/types';

export type Pixel = { x: number; y: number };
export type MapPoint = { x: number; y: number };

// 地图坐标（米，原点左下）→ 图片像素（原点左上）
export function mapToPixel(mapX: number, mapY: number, map: PatrolRouteMapInfo): Pixel {
  const px = (mapX - map.origin[0]) / map.resolution;
  const py = map.height - (mapY - map.origin[1]) / map.resolution;
  return { x: px, y: py };
}

// 图片像素 → 地图坐标（仅保留为工具函数，当前页面不用于编辑）
export function pixelToMap(px: number, py: number, map: PatrolRouteMapInfo): MapPoint {
  const mapX = px * map.resolution + map.origin[0];
  const mapY = (map.height - py) * map.resolution + map.origin[1];
  return { x: mapX, y: mapY };
}
