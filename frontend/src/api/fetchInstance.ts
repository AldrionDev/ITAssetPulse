const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const apiFetch = async <T>(
  endpoint: string,
  options: Omit<RequestInit, "body"> & { body?: unknown } = {},
): Promise<T> => {
  const token = localStorage.getItem("token");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const errorData = await response.json();
      message = errorData?.message ?? message;
    } catch {
      // Ignore JSON parsing errors and use the default message
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json() as Promise<T>;
};
