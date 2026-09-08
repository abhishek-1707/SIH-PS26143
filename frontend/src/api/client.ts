const API_BASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env["VITE_API_URL"]) ||
  "http://localhost:5000";

export async function apiClient<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    throw new Error(`API request failed with status ${res.status}: ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}
