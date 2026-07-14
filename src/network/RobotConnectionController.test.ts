import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_CONNECTION_CONFIG,
  RobotConnectionController,
  type ConnectionDependencies,
} from './RobotConnectionController.ts';

const ok = (robotId = 'robot-1') => ({
  ok: true,
  data: {
    online: true,
    connectionState: 'connected' as const,
    robotId,
    bridgeInstanceId: 'bridge-1',
    apiVersion: '1.1',
    timestamp: Date.now(),
  },
});

const networkFailure = (error: 'timeout' | 'network_error' = 'network_error') => ({
  ok: false,
  error,
  message: error,
});

function dependencies(overrides: Partial<ConnectionDependencies> = {}): ConnectionDependencies {
  return {
    probe: async () => ok(),
    emergencyStop: async () => ({ ok: true }),
    openStatusSocket: (_url, callbacks) => { callbacks.onOpen(); return { close() {} }; },
    openMapSocket: () => ({ close() {} }),
    storage: {
      getItem: async () => null,
      setItem: async () => undefined,
    },
    ...overrides,
  };
}

test('连接流程不会调用急停', async () => {
  let stopCalls = 0;
  const controller = new RobotConnectionController(dependencies({
    emergencyStop: async () => { stopCalls += 1; return { ok: true }; },
  }));

  await controller.connect();

  assert.equal(stopCalls, 0);
  assert.equal(controller.snapshot.phase, 'connected');
});

test('主地址超时后选择备用地址', async () => {
  let primaryAvailable = true;
  const controller = new RobotConnectionController(dependencies({
    probe: async (url) => url.includes('primary') && !primaryAvailable ? networkFailure('timeout') : ok(),
  }), {
    ...DEFAULT_CONNECTION_CONFIG,
    primaryUrl: 'http://primary:8000',
    fallbackUrl: 'http://fallback:8000',
  });
  await controller.connect();
  primaryAvailable = false;

  await controller.connect();

  assert.equal(controller.snapshot.activeUrl, 'http://fallback:8000');
  assert.equal(controller.snapshot.phase, 'connected');
});

test('旧连接结果不能覆盖新连接', async () => {
  let resolveFirst!: (value: ReturnType<typeof ok>) => void;
  const first = new Promise<ReturnType<typeof ok>>((resolve) => { resolveFirst = resolve; });
  let calls = 0;
  const controller = new RobotConnectionController(dependencies({
    probe: async () => ++calls === 1 ? first : ok('robot-new'),
  }));

  const oldConnect = controller.connect();
  const newConnect = controller.connect();
  await newConnect;
  resolveFirst(ok('robot-old'));
  await oldConnect;

  assert.equal(controller.snapshot.robotId, 'robot-new');
  assert.equal(controller.snapshot.phase, 'connected');
});

test('保存刷新频率不修改地址或关闭连接', async () => {
  let closes = 0;
  const controller = new RobotConnectionController(dependencies({
    openStatusSocket: (_url, callbacks) => { callbacks.onOpen(); return { close() { closes += 1; } }; },
  }));
  await controller.connect();
  const activeUrl = controller.snapshot.activeUrl;

  await controller.setRefreshInterval(5000);

  assert.equal(controller.snapshot.activeUrl, activeUrl);
  assert.equal(controller.snapshot.config.refreshIntervalMs, 5000);
  assert.equal(closes, 0);
});

test('不同 robotId 的地址不能组成主备', async () => {
  let primaryAvailable = true;
  const controller = new RobotConnectionController(dependencies({
    probe: async (url) => {
      if (url.includes('primary')) return primaryAvailable ? ok('robot-primary') : networkFailure();
      return ok('robot-fallback');
    },
  }), {
    ...DEFAULT_CONNECTION_CONFIG,
    primaryUrl: 'http://primary:8000',
    fallbackUrl: 'http://fallback:8000',
  });
  await controller.connect();
  primaryAvailable = false;

  await controller.connect();

  assert.equal(controller.snapshot.activeUrl, 'http://primary:8000');
  assert.equal(controller.snapshot.phase, 'error');
  assert.match(controller.snapshot.error ?? '', /不同机器人/);
});

test('Map WebSocket 出错后不会显示已连接', async () => {
  let onError!: (message: string) => void;
  const controller = new RobotConnectionController(dependencies({
    openMapSocket: (_url, callbacks) => {
      onError = callbacks.onError;
      return { close() {} };
    },
  }));

  controller.startMapStream();
  onError('map failed');

  assert.notEqual(controller.snapshot.mapPhase, 'connected');
  assert.equal(controller.snapshot.mapPhase, 'degraded');
});
