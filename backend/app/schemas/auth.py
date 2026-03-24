import re

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.schemas.user import UserResponse

_E164_RE = re.compile(r"^\+[1-9]\d{6,14}$")


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255, description="Full name")
    email: EmailStr
    password: str = Field(..., min_length=8, description="Minimum 8 characters")
    whatsapp_number: str | None = Field(
        None,
        description="WhatsApp number in E.164 format, e.g. +919876543210",
    )

    @field_validator("whatsapp_number")
    @classmethod
    def validate_whatsapp(cls, v: str | None) -> str | None:
        if v is not None and not _E164_RE.match(v):
            raise ValueError("WhatsApp number must be in E.164 format, e.g. +919876543210")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class LoginResponse(BaseModel):
    user: UserResponse
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class MessageResponse(BaseModel):
    message: str
