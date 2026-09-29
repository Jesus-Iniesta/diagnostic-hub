from typing import Annotated, Literal
from pathlib import Path

from pydantic import AliasChoices, Field, field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

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
    pg_host: str = Field(default="", validation_alias=AliasChoices("PGHOST", "POSTGRES_HOST"))
    pg_port: str = Field(default="5432", validation_alias=AliasChoices("PGPORT", "POSTGRES_PORT"))
    pg_user: str = Field(default="", validation_alias=AliasChoices("PGUSER", "POSTGRES_USER"))
    pg_password: str = Field(default="", validation_alias=AliasChoices("PGPASSWORD", "POSTGRES_PASSWORD"))
    pg_database: str = Field(default="", validation_alias=AliasChoices("PGDATABASE", "POSTGRES_DB"))
    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    cors_origins: Annotated[list[str], NoDecode] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    jwt_cookie_name: str = "tutonet_token"
    jwt_cookie_secure: bool = False
    jwt_cookie_samesite: Literal["lax", "strict", "none"] = "lax"

    @property
    def jwt_cookie_max_age(self) -> int:
        return self.access_token_expire_minutes * 60

    @field_validator("database_url")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        if value.startswith("postgres://"):
            return value.replace("postgres://", "postgresql+psycopg://", 1)
        if value.startswith("postgresql://"):
            return value.replace("postgresql://", "postgresql+psycopg://", 1)
        return value

    @model_validator(mode="after")
    def validate_required_settings(self):
        if not self.database_url.strip():
            if not all((self.pg_host, self.pg_user, self.pg_password, self.pg_database)):
                raise ValueError(
                    "Define DATABASE_URL o PGHOST, PGPORT, PGUSER, PGPASSWORD y PGDATABASE"
                )
            from urllib.parse import quote_plus

            user = quote_plus(self.pg_user)
            password = quote_plus(self.pg_password)
            self.database_url = (
                f"postgresql+psycopg://{user}:{password}@{self.pg_host}:"
                f"{self.pg_port}/{self.pg_database}"
            )
        if not self.jwt_secret.strip():
            raise ValueError("Define JWT_SECRET en las variables de entorno")
        return self

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


settings = Settings()