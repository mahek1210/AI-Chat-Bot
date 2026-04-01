import { supabase } from './supabase';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string;

/**
 * Central authenticated API client.
 * Automatically attaches the current Supabase session Bearer token
 * to every request to the Express backend.
 */
export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers,
  });
}

/** Convenience GET */
export const apiGet = (path: string) => apiFetch(path, { method: 'GET' });

/** Convenience POST */
export const apiPost = (path: string, body: unknown) =>
  apiFetch(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });

/** Convenience DELETE */
export const apiDelete = (path: string) => apiFetch(path, { method: 'DELETE' });
