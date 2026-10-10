
const API = (
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:4000/api/v1'
).replace(/\/+$/, '');

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API}${path.startsWith('/') ? path : `/${path}`}`;

  let response: Response;

  try {
    response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error(
      `Cannot connect to FoodRescue API at ${API}. Check that the backend is running and the API URL is correct.`,
    );
  }

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      body?.error?.message ||
        `Request failed with status ${response.status}.`,
    );
  }

  return body as T;
}
