import 'server-only';
import { cookies } from 'next/headers';

/** Name of the httpOnly cookie holding the traveller's Sanctum token (set by the auth BFF in M5). */
export const SESSION_COOKIE = 'musafir_session';

/** Authorization header for API calls made on behalf of the signed-in traveller (empty when signed out). */
export async function authHeaders(): Promise<Record<string, string>> {
  const t = (await cookies()).get(SESSION_COOKIE)?.value;
  return t ? { Authorization: `Bearer ${t}` } : {};
}
