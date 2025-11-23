import { cookies } from 'next/headers';

export async function isAuthenticated() {
  const cookieStore = await cookies();
  return cookieStore.get('admin_session')?.value === 'true';
}
