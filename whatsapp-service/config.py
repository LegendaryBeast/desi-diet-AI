"""Service configuration via Pydantic Settings."""

from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    port: int = Field(default=8010, alias="PORT")
    whatsapp_token: str = Field(alias="WHATSAPP_TOKEN")
    phone_number_id: str = Field(alias="PHONE_NUMBER_ID")
    whatsapp_verify_token: str = Field(alias="WHATSAPP_VERIFY_TOKEN")
    main_server_url: str = Field(alias="MAIN_SERVER_URL")
    whatsapp_service_api_key: str = Field(alias="WHATSAPP_SERVICE_API_KEY")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
