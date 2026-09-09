const API_BASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env["VITE_API_URL"]) ||
  "http://localhost:5000";

export async function apiClient<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      signal: options?.signal ?? AbortSignal.timeout(150000),
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
  } catch (error) {
    throw new Error(
      error instanceof Error && error.name === "TimeoutError"
        ? "PROCESSING ERROR: request timed out. Check saved reports before retrying."
        : "NETWORK ERROR: backend is unreachable. Start the backend, check VITE_API_URL and retry.",
    );
  }

  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new Error(`PROCESSING ERROR (${res.status}): ${detail?.error || res.statusText}`);
  }

  return res.json() as Promise<T>;
}
