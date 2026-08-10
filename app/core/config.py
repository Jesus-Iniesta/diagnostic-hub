from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = PROJECT_ROOT / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = ""
    app_version: str = "1.0.0"
    debug: bool = False

    database_url: str = ""
    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    @field_validator("database_url", "jwt_secret")
    @classmethod
    def required_env_var(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Debe definirse en el archivo .env")
        return value


settings = Settings()