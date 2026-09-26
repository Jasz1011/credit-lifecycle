import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { ApiErrorBody, User } from '../types/api';

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';
let accessToken: string | null = null;
let refreshPromise: Promise<AuthResponse> | null = null;

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export const api = axios.create({ baseURL, withCredentials: true });

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const isAuthRoute = original?.url?.startsWith('/auth/') ?? false;
    if (error.response?.status !== 401 || !original || original._retried || isAuthRoute) {
      return Promise.reject(error);
    }
    original._retried = true;
    refreshPromise ??= api.post<AuthResponse>('/auth/refresh').then((result) => result.data);
    try {
      const session = await refreshPromise;
      accessToken = session.accessToken;
      original.headers.Authorization = `Bearer ${accessToken}`;
      return api(original);
    } finally {
      refreshPromise = null;
    }
  },
);

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getErrorCode(error: unknown): string {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    return error.response?.data.code ?? 'NETWORK_ERROR';
  }
  return 'UNKNOWN_ERROR';
}

