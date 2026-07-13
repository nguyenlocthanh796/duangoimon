import { request, setToken, clearToken } from './client';

export async function login(username: string, password: string) {
  const data = await request<{
    access_token: string;
    token_type: string;
    user: { id: string; username: string; role: string; full_name?: string };
  }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  await setToken(data.access_token);
  return data;
}

export async function logout() {
  await clearToken();
}
