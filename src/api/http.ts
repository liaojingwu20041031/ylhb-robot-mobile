import { Platform } from 'react-native';
import { ApiResponse, RequestDiagnostics } from './types';

export const trimBaseUrl = (baseUrl: string) => baseUrl.trim().replace(/\/+$/, '');

const networkErrorSuggestions = [
  '检查小米/MIUI 的 WLAN/移动数据联网控制，确认本 App 允许联网。',
  '在手机浏览器打开同一个完整 URL，确认能访问 Jetson Bridge。',
  '卸载旧 App 后重新安装最新正式 APK，避免仍在运行旧包。',
  '确认 AndroidManifest 已允许 HTTP 明文流量 usesCleartextTraffic=true。',
  '检查 Base URL 是否包含 http://、IP、端口，且没有复制粘贴带入空格。',
];

function buildDiagnostics(
  baseUrl: string,
  path: string,
  options: RequestInit | undefined,
  startedAt: number,
  status?: number,
  error?: unknown,
): RequestDiagnostics {
  const normalizedBaseUrl = trimBaseUrl(baseUrl);
  const url = `${normalizedBaseUrl}${path}`;
  let parsed: URL | null = null;
  try {
    parsed = new URL(url);
  } catch {
    parsed = null;
  }
  return {
    method: options?.method ?? 'GET',
    url,
    baseUrl: normalizedBaseUrl,
    path,
    host: parsed?.hostname,
    port: parsed?.port,
    scheme: parsed?.protocol.replace(':', ''),
    durationMs: Date.now() - startedAt,
    platform: Platform.OS,
    status,
    errorName: error instanceof Error ? error.name : error ? typeof error : undefined,
    errorMessage: error instanceof Error ? error.message : error ? String(error) : undefined,
    suggestions: error ? networkErrorSuggestions : undefined,
  };
}

// 公共 HTTP 请求封装。Mobile Bridge 的业务成功必须同时检查 JSON 信封 ok。
export async function request<T>(
  baseUrl: string,
  path: string,
  options?: RequestInit,
): Promise<ApiResponse<T>> {
  const startedAt = Date.now();
  const normalizedBaseUrl = trimBaseUrl(baseUrl);
  const url = `${normalizedBaseUrl}${path}`;
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options?.headers ?? {}),
      },
      ...options,
    });
    const json = (await response.json().catch(() => null)) as ApiResponse<T> | T | null;
    if (!response.ok) {
      const envelope = json && typeof json === 'object' && 'ok' in json ? json as ApiResponse<T> : null;
      return {
        ok: false,
        error: envelope?.error ?? `http_${response.status}`,
        message: envelope?.message ?? response.statusText,
        diagnostics: buildDiagnostics(baseUrl, path, options, startedAt, response.status),
      };
    }
    if (json && typeof json === 'object' && 'ok' in json) {
      return {
        ...(json as ApiResponse<T>),
        diagnostics: buildDiagnostics(baseUrl, path, options, startedAt, response.status),
      };
    }
    return {
      ok: true,
      data: json as T,
      diagnostics: buildDiagnostics(baseUrl, path, options, startedAt, response.status),
    };
  } catch (error) {
    return {
      ok: false,
      error: 'network_error',
      message: error instanceof Error ? error.message : String(error),
      diagnostics: buildDiagnostics(baseUrl, path, options, startedAt, undefined, error),
    };
  }
}
