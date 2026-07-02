import axios from 'axios';

export const createApi = (token?: string) => {
  const api = axios.create({
    baseURL: process.env.EXPO_PUBLIC_API_URL|| 'http://10.234.11.110:4000',
    headers: {
      Authorization: token ? `Bearer ${token}` : undefined,
    },
  });
  return api;
};

type ApiOptions = {
  method: 'get' | 'post' | 'put' | 'delete';
  url: string;
  token?: string;
  data?: any;
};

export async function apiRequest<T>(options: ApiOptions): Promise<T>;
export async function apiRequest<T>(url: string, data?: any, token?: string): Promise<T>;
export async function apiRequest<T>(
  optionsOrUrl: ApiOptions | string,
  data?: any,
  token?: string
): Promise<T> {
  try {
    const options: ApiOptions = typeof optionsOrUrl === 'string'
      ? { method: 'get', url: optionsOrUrl, data, token }
      : optionsOrUrl;

    const api = createApi(options.token);

    const response = await api.request<T>({
      method: options.method,
      url: options.url,
      data: options.data,
    });

    return response.data;
  } catch (error: any) {
    throw new Error(`API request failed: ${error.message}`);
  }
}