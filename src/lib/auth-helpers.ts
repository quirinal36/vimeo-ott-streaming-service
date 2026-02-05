import { createClient } from '@/lib/supabase/server'

/**
 * 현재 세션에서 액세스 토큰을 가져옵니다.
 * FastAPI 백엔드 호출시 사용
 */
export async function getAccessToken(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

/**
 * 현재 사용자 정보와 액세스 토큰을 가져옵니다.
 */
export async function getCurrentUserWithToken() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return { user: null, token: null }
  }

  return {
    user: session.user,
    token: session.access_token,
  }
}
