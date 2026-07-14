import type { ApiResponse, MapSnapshot, RobotStatus } from '../api/types';

export type RobotConnectionConfig = {
  primaryUrl: string;
  fallbackUrl?: string;
  autoFailover: boolean;
  refreshIntervalMs: number;
};

export type ConnectionPhase =
  | 'idle'
  | 'probing'
  | 'connected'
  | 'switching'
  | 'degraded'
  | 'disconnected'
  | 'error';

export type MapStreamPhase =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'degraded'
  | 'disconnected';

export type RobotIdentityStatus = RobotStatus & {
  apiVersion?: string;
  robotId?: string;
  bridgeInstanceId?: string;
};

export type ConnectionSnapshot = {
  config: RobotConnectionConfig;
  phase: ConnectionPhase;
  mapPhase: MapStreamPhase;
  activeUrl?: string;
  lastSuccessfulUrl?: string;
  robotId?: string;
  status?: RobotIdentityStatus;
  statusSource?: 'HTTP fallback' | 'WebSocket';
  error?: string;
  mapError?: string;
};

export type SocketHandle = { close(): void };

export type StatusSocketCallbacks = {
  onOpen(): void;
  onStatus(status: RobotIdentityStatus): void;
  onError(message: string): void;
  onClose(): void;
};

export type MapSocketCallbacks = {
  onOpen(): void;
  onSnapshot(snapshot: MapSnapshot): void;
  onError(message: string): void;
  onClose(): void;
};

export type ConnectionStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem?(key: string): Promise<void>;
};

export type ConnectionDependencies = {
  probe(url: string, signal: AbortSignal): Promise<ApiResponse<RobotIdentityStatus>>;
  getStatus?(url: string, signal: AbortSignal): Promise<ApiResponse<RobotIdentityStatus>>;
  emergencyStop(url: string, signal: AbortSignal): Promise<ApiResponse<unknown>>;
  openStatusSocket(url: string, callbacks: StatusSocketCallbacks): SocketHandle;
  openMapSocket(url: string, callbacks: MapSocketCallbacks): SocketHandle;
  storage: ConnectionStorage;
  onChange?(snapshot: ConnectionSnapshot): void;
  onMapSnapshot?(snapshot: MapSnapshot): void;
};

export const DEFAULT_CONNECTION_CONFIG: RobotConnectionConfig = {
  primaryUrl: 'http://192.168.8.20:8000',
  fallbackUrl: undefined,
  autoFailover: true,
  refreshIntervalMs: 3000,
};

const CONFIG_KEY = 'robotConnectionConfigV2';
const RECENT_KEY = 'robotConnectionLastSuccessV2';
const RECENT_ROBOT_ID_KEY = 'robotConnectionLastRobotIdV2';
const MIGRATED_KEY = 'robotConnectionMigratedV2';
const LEGACY_BASE_URL_KEY = 'baseUrl';

export function normalizeRobotUrl(value: string): string | null {
  try {
    const parsed = new URL(value.trim());
    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) return null;
    if (parsed.username || parsed.password || parsed.search || parsed.hash) return null;
    if (parsed.pathname && parsed.pathname !== '/') return null;
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}

function isNetworkFailure(response: ApiResponse<unknown>): boolean {
  const type = response.errorType ?? response.error;
  return type === 'timeout' || type === 'network_error';
}

function normalizedConfig(config: RobotConnectionConfig): RobotConnectionConfig | null {
  const primaryUrl = normalizeRobotUrl(config.primaryUrl);
  const fallbackUrl = config.fallbackUrl ? normalizeRobotUrl(config.fallbackUrl) : undefined;
  if (!primaryUrl || (config.fallbackUrl && !fallbackUrl) || fallbackUrl === primaryUrl) return null;
  return {
    primaryUrl,
    fallbackUrl: fallbackUrl ?? undefined,
    autoFailover: Boolean(config.autoFailover),
    refreshIntervalMs: Math.max(500, Math.min(60000, Math.round(config.refreshIntervalMs))),
  };
}

export class RobotConnectionController {
  private readonly dependencies: ConnectionDependencies;
  private state: ConnectionSnapshot;
  private operationId = 0;
  private operationAbort?: AbortController;
  private statusGeneration = 0;
  private mapGeneration = 0;
  private statusSocket?: SocketHandle;
  private statusOpenTimer?: ReturnType<typeof setTimeout>;
  private statusReconnectTimer?: ReturnType<typeof setTimeout>;
  private mapSocket?: SocketHandle;
  private mapOpenTimer?: ReturnType<typeof setTimeout>;
  private mapRequested = false;
  private endpointRobotIds = new Map<string, string>();

  constructor(
    dependencies: ConnectionDependencies,
    initialConfig: RobotConnectionConfig = DEFAULT_CONNECTION_CONFIG,
  ) {
    this.dependencies = dependencies;
    this.state = {
      config: normalizedConfig(initialConfig) ?? DEFAULT_CONNECTION_CONFIG,
      phase: 'idle',
      mapPhase: 'idle',
    };
  }

  get snapshot(): ConnectionSnapshot {
    return { ...this.state, config: { ...this.state.config } };
  }

  private update(change: Partial<ConnectionSnapshot>): void {
    this.state = { ...this.state, ...change };
    this.dependencies.onChange?.(this.snapshot);
  }

  private current(operationId: number): boolean {
    return operationId === this.operationId;
  }

  private async persist(): Promise<void> {
    try {
      await this.dependencies.storage.setItem(CONFIG_KEY, JSON.stringify(this.state.config));
      if (this.state.lastSuccessfulUrl) {
        await this.dependencies.storage.setItem(RECENT_KEY, this.state.lastSuccessfulUrl);
      } else {
        await this.dependencies.storage.removeItem?.(RECENT_KEY);
      }
      if (this.state.robotId) {
        await this.dependencies.storage.setItem(RECENT_ROBOT_ID_KEY, this.state.robotId);
      } else {
        await this.dependencies.storage.removeItem?.(RECENT_ROBOT_ID_KEY);
      }
    } catch {
      // Persistence failure must not block connection with in-memory defaults.
    }
  }

  async initialize(): Promise<void> {
    try {
      const [savedConfig, recentUrl, recentRobotId, migrated] = await Promise.all([
        this.dependencies.storage.getItem(CONFIG_KEY),
        this.dependencies.storage.getItem(RECENT_KEY),
        this.dependencies.storage.getItem(RECENT_ROBOT_ID_KEY),
        this.dependencies.storage.getItem(MIGRATED_KEY),
      ]);
      if (savedConfig) {
        const parsed = normalizedConfig(JSON.parse(savedConfig) as RobotConnectionConfig);
        if (parsed) this.state.config = parsed;
      } else if (migrated !== '1') {
        const legacyUrl = normalizeRobotUrl(await this.dependencies.storage.getItem(LEGACY_BASE_URL_KEY) ?? '');
        if (legacyUrl) this.state.config = { ...this.state.config, primaryUrl: legacyUrl };
        await this.dependencies.storage.setItem(CONFIG_KEY, JSON.stringify(this.state.config));
        await this.dependencies.storage.setItem(MIGRATED_KEY, '1');
      }
      if (recentUrl && [this.state.config.primaryUrl, this.state.config.fallbackUrl].includes(recentUrl)) {
        this.state.lastSuccessfulUrl = recentUrl;
      }
      if (recentRobotId) this.state.robotId = recentRobotId;
    } catch {
      // Invalid or unavailable storage falls back to defaults.
    }
    this.update({ config: this.state.config });
    await this.connect();
  }

  async saveConnectionConfig(config: RobotConnectionConfig): Promise<boolean> {
    const normalized = normalizedConfig(config);
    if (!normalized) {
      this.update({ error: '主地址或备用地址格式无效', phase: 'error' });
      return false;
    }
    const oldAddresses = new Set([this.state.config.primaryUrl, this.state.config.fallbackUrl].filter(Boolean));
    const newAddresses = [normalized.primaryUrl, normalized.fallbackUrl].filter(Boolean) as string[];
    const sameRobotConfig = newAddresses.every((url) => oldAddresses.has(url));
    if (!sameRobotConfig) {
      this.endpointRobotIds.clear();
      this.state.robotId = undefined;
      this.state.lastSuccessfulUrl = undefined;
    }
    this.update({
      config: normalized,
      activeUrl: newAddresses.includes(this.state.activeUrl ?? '') ? this.state.activeUrl : undefined,
      error: undefined,
    });
    await this.persist();
    return true;
  }

  async setRefreshInterval(refreshIntervalMs: number): Promise<void> {
    const config = normalizedConfig({ ...this.state.config, refreshIntervalMs });
    if (!config) return;
    this.update({ config });
    await this.persist();
  }

  private orderedCandidates(): string[] {
    const { primaryUrl, fallbackUrl } = this.state.config;
    const recent = this.state.lastSuccessfulUrl;
    const first = recent && [primaryUrl, fallbackUrl].includes(recent) ? recent : primaryUrl;
    const candidates = [first];
    const other = first === primaryUrl ? fallbackUrl : primaryUrl;
    if (this.state.config.autoFailover && other) candidates.push(other);
    return candidates;
  }

  async connect(): Promise<ApiResponse<RobotIdentityStatus>> {
    const operationId = ++this.operationId;
    this.operationAbort?.abort();
    const abort = new AbortController();
    this.operationAbort = abort;
    this.closeStatusSocket();
    this.closeMapSocket(false);
    this.update({
      phase: this.state.activeUrl ? 'switching' : 'probing',
      mapPhase: this.mapRequested ? 'connecting' : this.state.mapPhase,
      error: undefined,
    });

    let lastResponse: ApiResponse<RobotIdentityStatus> = {
      ok: false,
      error: 'network_error',
      message: '没有可用地址',
    };
    const candidates = this.orderedCandidates();
    for (let index = 0; index < candidates.length; index += 1) {
      const url = candidates[index];
      const response = await this.dependencies.probe(url, abort.signal);
      if (!this.current(operationId)) return response;
      lastResponse = response;
      if (response.ok && response.data?.online) {
        const robotId = response.data.robotId;
        const knownRobotId = this.state.robotId;
        const isFallback = url === this.state.config.fallbackUrl;
        if (isFallback && (!robotId || !knownRobotId)) {
          this.update({ phase: 'error', error: '无法确认主地址与备用地址属于同一机器人' });
          return { ok: false, error: 'robot_identity_unverified', message: '无法确认主地址与备用地址属于同一机器人' };
        }
        if (robotId && knownRobotId && robotId !== knownRobotId) {
          this.update({ phase: 'error', error: '主地址与备用地址属于不同机器人' });
          return { ok: false, error: 'robot_mismatch', message: '主地址与备用地址属于不同机器人' };
        }
        if (robotId) this.endpointRobotIds.set(url, robotId);
        this.update({
          activeUrl: url,
          lastSuccessfulUrl: url,
          robotId: robotId ?? knownRobotId,
          status: response.data,
          statusSource: 'HTTP fallback',
          phase: 'connected',
          error: undefined,
        });
        await this.persist();
        if (!this.current(operationId)) return response;
        this.openStatusSocket(url);
        if (this.mapRequested) this.openMapSocket(url);
        return response;
      }
      if (!isNetworkFailure(response) || index === candidates.length - 1) break;
      this.update({ phase: 'switching' });
    }

    if (this.current(operationId)) {
      this.update({
        phase: isNetworkFailure(lastResponse) ? 'disconnected' : 'error',
        error: lastResponse.message ?? lastResponse.error ?? '连接失败',
      });
    }
    return lastResponse;
  }

  async refreshStatus(): Promise<ApiResponse<RobotIdentityStatus>> {
    const operationId = this.operationId;
    const url = this.state.activeUrl ?? this.state.config.primaryUrl;
    const abort = new AbortController();
    const response = await (this.dependencies.getStatus ?? this.dependencies.probe)(url, abort.signal);
    if (operationId !== this.operationId || url !== (this.state.activeUrl ?? this.state.config.primaryUrl)) return response;
    if (response.ok && response.data?.online) {
      this.update({ status: response.data, statusSource: 'HTTP fallback', phase: 'connected', error: undefined });
    } else if (isNetworkFailure(response)) {
      void this.connect();
    } else {
      this.update({ phase: 'error', error: response.message ?? response.error ?? '状态请求失败' });
    }
    return response;
  }

  async testEndpoint(which: 'primary' | 'fallback'): Promise<ApiResponse<RobotIdentityStatus>> {
    const url = which === 'primary' ? this.state.config.primaryUrl : this.state.config.fallbackUrl;
    if (!url) return { ok: false, error: 'missing_endpoint', message: '未配置备用地址' };
    const response = await this.dependencies.probe(url, new AbortController().signal);
    if (response.ok && response.data?.robotId) {
      this.endpointRobotIds.set(url, response.data.robotId);
      if (which === 'primary') {
        this.state.robotId = response.data.robotId;
        void this.persist();
      }
      const otherUrl = which === 'primary' ? this.state.config.fallbackUrl : this.state.config.primaryUrl;
      const otherRobotId = otherUrl ? this.endpointRobotIds.get(otherUrl) : undefined;
      if (otherRobotId && otherRobotId !== response.data.robotId) {
        return { ok: false, error: 'robot_mismatch', message: '主地址与备用地址属于不同机器人' };
      }
    }
    return response;
  }

  async emergencyStop(): Promise<boolean> {
    const { primaryUrl, fallbackUrl } = this.state.config;
    const primaryRobotId = this.endpointRobotIds.get(primaryUrl);
    const fallbackRobotId = fallbackUrl ? this.endpointRobotIds.get(fallbackUrl) : undefined;
    const addresses = fallbackUrl && primaryRobotId && primaryRobotId === fallbackRobotId
      ? [primaryUrl, fallbackUrl]
      : [this.state.activeUrl ?? primaryUrl];
    return Promise.any(addresses.map(async (url) => {
      const response = await this.dependencies.emergencyStop(url, new AbortController().signal);
      if (!response.ok) throw new Error(response.message ?? response.error ?? '急停失败');
      return true;
    })).catch(() => false);
  }

  private closeStatusSocket(): void {
    this.statusGeneration += 1;
    if (this.statusReconnectTimer) clearTimeout(this.statusReconnectTimer);
    if (this.statusOpenTimer) clearTimeout(this.statusOpenTimer);
    this.statusOpenTimer = undefined;
    this.statusReconnectTimer = undefined;
    this.statusSocket?.close();
    this.statusSocket = undefined;
  }

  private openStatusSocket(url: string): void {
    this.closeStatusSocket();
    const generation = ++this.statusGeneration;
    let failureHandled = false;
    let socket: SocketHandle | undefined;
    const openTimer = setTimeout(() => {
      handleFailure('Status WebSocket 连接超时');
    }, 3000);
    this.statusOpenTimer = openTimer;
    const handleFailure = (message: string) => {
      if (generation !== this.statusGeneration || failureHandled) return;
      failureHandled = true;
      clearTimeout(openTimer);
      if (this.statusOpenTimer === openTimer) this.statusOpenTimer = undefined;
      this.update({ phase: 'degraded', statusSource: 'HTTP fallback', error: message });
      socket?.close();
      if (this.statusSocket === socket) this.statusSocket = undefined;
      void this.verifySocketFailure(url, generation);
    };
    socket = this.dependencies.openStatusSocket(url, {
      onOpen: () => {
        clearTimeout(openTimer);
        if (this.statusOpenTimer === openTimer) this.statusOpenTimer = undefined;
      },
      onStatus: (status) => {
        if (generation !== this.statusGeneration || failureHandled) return;
        clearTimeout(openTimer);
        if (this.statusOpenTimer === openTimer) this.statusOpenTimer = undefined;
        this.update({ status, statusSource: 'WebSocket', phase: 'connected', error: undefined });
      },
      onError: handleFailure,
      onClose: () => {
        if (generation !== this.statusGeneration) return;
        clearTimeout(openTimer);
        if (this.statusOpenTimer === openTimer) this.statusOpenTimer = undefined;
        this.statusSocket = undefined;
        if (failureHandled) return;
        handleFailure('Status WebSocket 已断开');
      },
    });
    if (failureHandled) socket.close();
    else this.statusSocket = socket;
  }

  private async verifySocketFailure(url: string, statusGeneration?: number): Promise<void> {
    const operationId = this.operationId;
    const response = await this.dependencies.probe(url, new AbortController().signal);
    if (operationId !== this.operationId || url !== (this.state.activeUrl ?? this.state.config.primaryUrl)) return;
    if (response.ok && response.data?.online) {
      this.update({ status: response.data, statusSource: 'HTTP fallback', phase: 'connected', error: undefined });
      if (statusGeneration !== undefined) {
        this.statusReconnectTimer = setTimeout(() => {
          if (statusGeneration === this.statusGeneration && this.state.activeUrl === url) this.openStatusSocket(url);
        }, 1000);
      }
    } else if (isNetworkFailure(response)) {
      await this.connect();
    } else {
      this.update({ phase: 'error', error: response.message ?? response.error ?? '连接错误' });
    }
  }

  startMapStream(): void {
    this.mapRequested = true;
    this.openMapSocket(this.state.activeUrl ?? this.state.config.primaryUrl);
  }

  private openMapSocket(url: string): void {
    this.closeMapSocket(false);
    const generation = ++this.mapGeneration;
    let failureHandled = false;
    let socket: SocketHandle | undefined;
    const openTimer = setTimeout(() => {
      handleFailure('Map WebSocket 连接超时');
    }, 3000);
    this.mapOpenTimer = openTimer;
    const handleFailure = (message: string) => {
      if (generation !== this.mapGeneration || failureHandled) return;
      failureHandled = true;
      clearTimeout(openTimer);
      if (this.mapOpenTimer === openTimer) this.mapOpenTimer = undefined;
      this.update({ mapPhase: 'degraded', mapError: message });
      socket?.close();
      if (this.mapSocket === socket) this.mapSocket = undefined;
      void this.verifySocketFailure(url);
    };
    this.update({ mapPhase: 'connecting', mapError: undefined });
    socket = this.dependencies.openMapSocket(url, {
      onOpen: () => {
        if (generation !== this.mapGeneration || failureHandled) return;
        clearTimeout(openTimer);
        if (this.mapOpenTimer === openTimer) this.mapOpenTimer = undefined;
        this.update({ mapPhase: 'connected', mapError: undefined });
      },
      onSnapshot: (snapshot) => {
        if (generation !== this.mapGeneration || failureHandled) return;
        clearTimeout(openTimer);
        if (this.mapOpenTimer === openTimer) this.mapOpenTimer = undefined;
        this.update({ mapPhase: 'connected', mapError: undefined });
        this.dependencies.onMapSnapshot?.(snapshot);
      },
      onError: handleFailure,
      onClose: () => {
        if (generation !== this.mapGeneration) return;
        clearTimeout(openTimer);
        if (this.mapOpenTimer === openTimer) this.mapOpenTimer = undefined;
        this.mapSocket = undefined;
        if (failureHandled) return;
        this.update({ mapPhase: 'disconnected' });
        handleFailure('Map WebSocket 已断开');
      },
    });
    if (failureHandled) socket.close();
    else this.mapSocket = socket;
  }

  stopMapStream(): void {
    this.mapRequested = false;
    this.closeMapSocket(true);
  }

  private closeMapSocket(updateState: boolean): void {
    this.mapGeneration += 1;
    if (this.mapOpenTimer) clearTimeout(this.mapOpenTimer);
    this.mapOpenTimer = undefined;
    this.mapSocket?.close();
    this.mapSocket = undefined;
    if (updateState) this.update({ mapPhase: 'idle' });
  }
}
