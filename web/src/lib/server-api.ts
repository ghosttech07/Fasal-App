import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ACCESS_COOKIE, API_URL } from './session';

/** GET from the API inside a server component, as the signed-in farmer. */
export async function serverGet<T>(path: string): Promise<T> {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  const r = await fetch(`${API_URL}/api/v1${path}`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
  });
  if (r.status === 401) redirect('/login');
  if (!r.ok) throw new Error(`API ${path} failed with ${r.status}`);
  return (await r.json()) as T;
}
