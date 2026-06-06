import axios from "axios";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const supabase = createSupabaseBrowserClient();

export const apiClient = axios.create({
  baseURL: "/api/v1",
  headers: { "Content-Type": "application/json" },
});

function toCamelCase(value: string): string {
  return value.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function camelize<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => camelize(item)) as T;
  }

  if (!value || typeof value !== "object" || value instanceof File || value instanceof Blob) {
    return value;
  }

  return Object.entries(value as Record<string, unknown>).reduce(
    (acc, [key, entry]) => {
      acc[toCamelCase(key)] = camelize(entry);
      return acc;
    },
    {} as Record<string, unknown>
  ) as T;
}

apiClient.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => {
    res.data = camelize(res.data);
    return res;
  },
  (err) => {
    const message =
      err.response?.data?.detail ?? err.message ?? "Request failed";
    return Promise.reject(new Error(message));
  }
);
