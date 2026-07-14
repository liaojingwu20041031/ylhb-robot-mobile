import { createRobotApi } from '../api/robotApi';
import type { ApiResponse, RobotEndpoint, RobotEndpointKind, RobotStatus } from '../api/types';

export type EndpointProbeResult = {
  endpoint: RobotEndpoint;
  response: ApiResponse<RobotStatus>;
  ok: boolean;
  reason: string;
  latencyMs: number;
};

export type ReachableEndpointResult = {
  endpoint?: RobotEndpoint;
  status?: RobotStatus;
  attempts: EndpointProbeResult[];
};

export type EndpointProbe = (endpoint: RobotEndpoint) => Promise<EndpointProbeResult>;

export function normalizeEndpointUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) return null;
    if (parsed.username || parsed.password || parsed.search || parsed.hash) return null;
    if (parsed.pathname && parsed.pathname !== '/') return null;
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}

export function endpointId(url: string, kind: RobotEndpointKind): string {
  return `${kind}:${url}`;
}

export function dedupeEndpoints(endpoints: RobotEndpoint[]): RobotEndpoint[] {
  const byUrl = new Map<string, RobotEndpoint>();
  endpoints.forEach((endpoint) => {
    const url = normalizeEndpointUrl(endpoint.url);
    if (!url) return;
    const current = byUrl.get(url);
    if (!current) {
      byUrl.set(url, { ...endpoint, url });
      return;
    }
    byUrl.set(url, {
      ...current,
      enabled: current.enabled || endpoint.enabled,
      preferred: current.preferred || endpoint.preferred,
      lastSuccessAt: Math.max(current.lastSuccessAt ?? 0, endpoint.lastSuccessAt ?? 0) || undefined,
      lastFailureAt: Math.max(current.lastFailureAt ?? 0, endpoint.lastFailureAt ?? 0) || undefined,
    });
  });
  return Array.from(byUrl.values());
}

export function orderedEndpoints(endpoints: RobotEndpoint[], activeEndpointId?: string): RobotEndpoint[] {
  return endpoints
    .filter((endpoint) => endpoint.enabled && normalizeEndpointUrl(endpoint.url))
    .map((endpoint, index) => ({ endpoint, index }))
    .sort((left, right) => {
      const rank = (endpoint: RobotEndpoint) => {
        if (endpoint.id === activeEndpointId) return 0;
        if (endpoint.lastSuccessAt) return 1;
        if (endpoint.preferred) return 2;
        return 3;
      };
      const rankDifference = rank(left.endpoint) - rank(right.endpoint);
      if (rankDifference) return rankDifference;
      if (rank(left.endpoint) === 1) {
        const successDifference = (right.endpoint.lastSuccessAt ?? 0) - (left.endpoint.lastSuccessAt ?? 0);
        if (successDifference) return successDifference;
      }
      return left.index - right.index;
    })
    .map(({ endpoint }) => endpoint);
}

export function isNetworkFailure(response: ApiResponse<unknown>): boolean {
  return response.error === 'network_error' || (!response.ok && response.diagnostics?.status === undefined);
}

export async function probeEndpoint(endpoint: RobotEndpoint): Promise<EndpointProbeResult> {
  const startedAt = Date.now();
  const response = await createRobotApi(endpoint.url).getStatus();
  const ok = Boolean(response.ok && response.data?.online === true);
  return {
    endpoint,
    response,
    ok,
    reason: ok
      ? '可用'
      : response.message ?? response.error ?? (response.data?.online === false ? '机器人离线' : '状态不可用'),
    latencyMs: Date.now() - startedAt,
  };
}

export async function chooseReachableEndpoint(
  endpoints: RobotEndpoint[],
  activeEndpointId?: string,
  probe: EndpointProbe = probeEndpoint,
): Promise<ReachableEndpointResult> {
  const attempts: EndpointProbeResult[] = [];
  for (const endpoint of orderedEndpoints(endpoints, activeEndpointId)) {
    const result = await probe(endpoint);
    attempts.push(result);
    if (result.ok && result.response.data) {
      return { endpoint, status: result.response.data, attempts };
    }
  }
  return { attempts };
}
