import { ApiResponse } from './types';

export const trimBaseUrl = (baseUrl: string) => baseUrl.replace(/\/+$/, '');

// 公共 HTTP 请求封装。Mobile Bridge 的业务成功必须同时检查 JSON 信封 ok。
export async function request<T>(
  baseUrl: string,
  path: string,
  options?: RequestInit,
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${trimBaseUrl(baseUrl)}${path}`, {
      headers: {
        Accept: 'application/json',
        ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options?.headers ?? {}),
      },
      ...options,
    });
    const json = (await response.json().catch(() => null)) as ApiResponse<T> | T | null;
    if (json && typeof json === 'object' && 'ok' in json) {
      return json as ApiResponse<T>;
    }
    if (!response.ok) {
      return {
        ok: false,
        error: `http_${response.status}`,
        message: response.statusText,
      };
    }
    return { ok: true, data: json as T };
  } catch (error) {
    return {
      ok: false,
      error: 'network_error',
      message: error instanceof Error ? error.message : String(error),
    };
  }
}