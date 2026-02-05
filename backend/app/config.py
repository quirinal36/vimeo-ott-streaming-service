from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Supabase
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str

    # Cloudflare Stream
    CLOUDFLARE_ACCOUNT_ID: str
    CLOUDFLARE_API_TOKEN: str
    CLOUDFLARE_SIGNING_KEY_ID: str
    CLOUDFLARE_SIGNING_KEY_PEM: str  # base64 encoded
    CLOUDFLARE_CUSTOMER_CODE: str

    # App
    FRONTEND_URL: str = "http://localhost:3000"

    class Config:
        env_file = ".env"


settings = Settings()
