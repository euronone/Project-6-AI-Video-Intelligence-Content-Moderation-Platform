import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict

from app.models.user import UserRole

class UserBase(BaseModel):
    """Shared properties for User schemas."""
    email: EmailStr
    role: UserRole = UserRole.OPERATOR
    tenant_id: str | None = None
    is_active: bool = True

class UserCreate(UserBase):
    """Properties to receive via API on creation."""
    password: str = Field(..., min_length=8, description="User password (min 8 chars)")

class UserUpdate(BaseModel):
    """Properties to receive via API on update."""
    email: EmailStr | None = None
    role: UserRole | None = None
    tenant_id: str | None = None
    is_active: bool | None = None
    password: str | None = Field(None, min_length=8, description="New password (optional)")

class UserResponse(UserBase):
    """Properties to return to client (excludes password_hash)."""
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
