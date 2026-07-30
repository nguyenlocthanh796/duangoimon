from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/pos_db"
    redis_url: str = "redis://localhost:6379/0"
    secret_key: str  # MUST be set via env SECRET_KEY — no default for security
    hardcoded_user: str = "admin"
    hardcoded_pass: str  # MUST be set via env HARDCODED_PASS — no default

    model_config = {"env_file": "../.env", "env_file_encoding": "utf-8", "extra": "ignore"}

    def __init__(self, **data):
        super().__init__(**data)
        # Warn if database_url uses default credentials
        if "postgres:postgres@" in self.database_url:
            import warnings
            warnings.warn(
                "WARNING: DATABASE_URL đang dùng mật khẩu mặc định 'postgres:postgres'. "
                "Hãy đặt biến môi trường DATABASE_URL cho production.",
                RuntimeWarning,
                stacklevel=2,
            )


settings = Settings()

# Validation: ensure critical secrets are set
if not settings.secret_key or settings.secret_key == "change-me-to-a-random-secret":
    raise RuntimeError(
        "SECRET_KEY không hợp lệ. Tạo key mới: "
        "python -c 'import secrets; print(secrets.token_urlsafe(32))'"
    )
if not settings.hardcoded_pass:
    raise RuntimeError(
        "HARDCODED_PASS chưa được đặt trong .env. "
        "Vui lòng đặt mật khẩu admin mạnh (tối thiểu 8 ký tự)."
    )
