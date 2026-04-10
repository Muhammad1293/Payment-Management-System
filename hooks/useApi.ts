'use client';
// hooks/useApi.ts
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

interface ApiOptions extends RequestInit {
  json?: unknown;
}

interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

export function useApi() {
  const router = useRouter();

  const call = useCallback(async <T = unknown>(
    url: string,
    options: ApiOptions = {}
  ): Promise<ApiResponse<T>> => {
    const { json, ...rest } = options;

    const headers: Record<string, string> = {
      ...(rest.headers as Record<string, string> || {}),
    };

    if (json !== undefined) {
      headers['Content-Type'] = 'application/json';
      rest.body = JSON.stringify(json);
    }

    try {
      const res = await fetch(url, { ...rest, headers });

      // Auto-redirect on 401
      if (res.status === 401) {
        router.push('/login');
        return { data: null, error: 'Session expired', status: 401 };
      }

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        return {
          data: null,
          error: body.error || `Request failed (${res.status})`,
          status: res.status,
        };
      }

      return { data: body.data ?? body, error: null, status: res.status };
    } catch (err) {
      return { data: null, error: 'Network error. Please check your connection.', status: 0 };
    }
  }, [router]);

  const get  = <T = unknown>(url: string) => call<T>(url, { method: 'GET' });
  const post = <T = unknown>(url: string, json: unknown) => call<T>(url, { method: 'POST', json });
  const patch = <T = unknown>(url: string, json: unknown) => call<T>(url, { method: 'PATCH', json });
  const del  = <T = unknown>(url: string) => call<T>(url, { method: 'DELETE' });

  return { call, get, post, patch, del };
}
