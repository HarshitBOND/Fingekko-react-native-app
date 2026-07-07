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
    // Surface the backend's actual validation/error message (e.g. "Target amount
    // must be greater than 0.") instead of axios's generic "Request failed with
    // status code 400", which is all callers used to ever see.
    const backendMessage = error?.response?.data?.message ?? error?.response?.data?.error;
    throw new Error(backendMessage || error.message || 'API request failed.');
  }
}