import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { API_BASE_URL, API_V1 } from '@/lib/constants';

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  error: ApiError;
}

export class ApiClient {
  private instance: AxiosInstance;

  constructor(baseURL: string) {
    this.instance = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30_000,
    });

    this.instance.interceptors.request.use((config) => {
      const token = this.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    this.instance.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          const refreshed = await this.tryRefreshToken();
          if (refreshed) {
            error.config.headers.Authorization = `Bearer ${this.getToken()}`;
            return this.instance.request(error.config);
          }
          this.clearTokens();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(this.normalizeError(error));
      }
    );
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  }

  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refresh_token');
  }

  clearTokens(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  setTokens(accessToken: string, refreshToken: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  }

  private async tryRefreshToken(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;
    try {
      const response = await axios.post(`${API_BASE_URL}${API_V1}/auth/refresh`, {
        refresh_token: refreshToken,
      });
      const { access_token, refresh_token } = response.data.data;
      this.setTokens(access_token, refresh_token);
      return true;
    } catch {
      return false;
    }
  }

  private normalizeError(error: unknown): ApiError {
    if (axios.isAxiosError(error) && error.response?.data?.error) {
      return error.response.data.error as ApiError;
    }
    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred. Please try again.',
    };
  }

  async get<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.get<{ data: T }>(path, config);
    return response.data.data;
  }

  async post<T>(path: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.post<{ data: T }>(path, data, config);
    return response.data.data;
  }

  async patch<T>(path: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.patch<{ data: T }>(path, data, config);
    return response.data.data;
  }

  async put<T>(path: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.put<{ data: T }>(path, data, config);
    return response.data.data;
  }

  async delete<T = void>(path: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.delete<{ data: T } | null>(path, config);
    return ((response.data as { data: T } | null)?.data) as T;
  }
}

export const apiClient = new ApiClient(`${API_BASE_URL}${API_V1}`);
