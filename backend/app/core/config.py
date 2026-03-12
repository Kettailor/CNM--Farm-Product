from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Farm Product Traceability API"
    app_version: str = "2.0.0"
    database_url: str = "postgresql+psycopg://traceability:traceability@postgres:5432/traceability"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
