from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Supabase
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str

    # Bunny Stream
    BUNNY_STREAM_API_KEY: str
    BUNNY_VIDEO_LIBRARY_API_KEY: str
    BUNNY_VIDEO_LIBRARY_ID: str = "593678"
    BUNNY_VIDEO_LIBRARY_HOSTNAME: str = "vz-27718a49-df0.b-cdn.net"
    BUNNY_STREAM_TOKEN_AUTH_KEY: str = ""

    # App
    FRONTEND_URL: str = "http://localhost:3000"

    class Config:
        env_file = ".env"


settings = Settings()
