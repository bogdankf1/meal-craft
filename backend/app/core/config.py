from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "MealCraft API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5435/mealcraft_dev"

    # Security
    SECRET_KEY: str = "your-secret-key-min-32-chars-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # Claude API
    ANTHROPIC_API_KEY: str = ""

    # Stripe
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PRICE_PLUS: str = ""  # Price ID for Chef's Choice tier
    STRIPE_PRICE_PRO: str = ""   # Price ID for Master Chef tier

    # Image Storage (Cloudinary)
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    # Google Vision API (OCR)
    GOOGLE_VISION_API_KEY: str = ""

    # Frontend URL (for CORS)
    FRONTEND_URL: str = "http://localhost:3001"

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3001"]

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
