export async function apiFetch<T>(
  url: string,
  options?: RequestInit,
): Promise<{ data?: T; error?: string; errors?: unknown; status: number }> {
  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      error: json.error ?? "Request failed",
      errors: json.errors,
      status: res.status,
    };
  }
  return { data: json as T, status: res.status };
}
