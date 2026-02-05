from supabase import create_client, Client

from app.config import settings


def get_supabase_client() -> Client:
    """일반 Supabase 클라이언트 (anon key)"""
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)


def get_supabase_admin_client() -> Client:
    """관리자 Supabase 클라이언트 (service role key) - RLS 우회"""
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


def get_supabase_client_with_token(token: str) -> Client:
    """사용자 토큰으로 인증된 Supabase 클라이언트 (RLS 적용)"""
    client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    client.auth.set_session(token, token)  # access_token, refresh_token
    return client
