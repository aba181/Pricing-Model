from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://postgres:postgres@localhost:5432/acmi_platform"
    jwt_secret: str = "change-me-to-a-32-char-random-string"
    environment: str = "development"
    frontend_url: str = "http://localhost:3000"
    allowed_origins: str = ""  # comma-separated additional origins

    @property
    def cookie_secure(self) -> bool:
        return self.environment != "development"

    class Config:
        env_file = ".env"


settings = Settings()
