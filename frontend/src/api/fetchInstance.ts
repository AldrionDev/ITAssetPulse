const BASE_URL = "http://localhost:3000";

export class ApiError extends Error {
  public status: number;
  public data?: unknown;

  constructor(
    status: number,
    message: string,
    data?: unknown
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export const apiFetch = async <T>(
  endpoint: string,
  options: RequestInit & { body?: unknown } = {}
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
    let errorData: unknown = null;
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: response.statusText };
    }

    const message =
      (errorData as { message?: string })?.message ??
      `HTTP ${response.status}: ${response.statusText}`;

    throw new ApiError(response.status, message, errorData);
  }

  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return null as T;
  }

  return response.json() as Promise<T>;
};