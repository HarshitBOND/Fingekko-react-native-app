import axios from 'axios';

export const createApi= (token?: string)=>{
  const api= axios.create({
    baseURL: process.env.EXPO_PUBLIC_API_URL|| 'http://10.234.11.110:4000',
    headers: {
      Authorization: token ? `Bearer ${token}` : undefined,
    },
  })
  return api;
}

type ApiOptions = {
  method: 'get' | 'post' | 'put' | 'delete';
  url: string;
  token?: string;
  data?: any;
};

export const apiRequest = async <T>({
  method,
  url,
  token,
  data,
}: ApiOptions): Promise<T> => {
  try {
    const api = createApi(token);

    const response = await api.request<T>({
      method,
      url,
      data,
    });

    return response.data;
  } catch (error: any) {
    throw new Error(`API request failed: ${error.message}`);
  }
};