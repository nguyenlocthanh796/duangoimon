from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/pos_db"
    redis_url: str = "redis://localhost:6379/0"
    secret_key: str = "change-me-to-a-random-secret"
    hardcoded_user: str = "admin"
    hardcoded_pass: str = "admin123"

    model_config = {"env_file": ".env"}


settings = Settings()
