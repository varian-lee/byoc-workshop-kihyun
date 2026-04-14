from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://todouser:todopassword@db:5432/tododb"
    app_name: str = "Todo API"
    debug: bool = False

    class Config:
        env_file = ".env"


settings = Settings()
