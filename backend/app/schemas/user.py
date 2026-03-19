import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict, computed_field

from app.models.user import UserRole


class UserBase(BaseModel):
    """Shared properties for User schemas."""
    email: EmailStr
    name: str | None = None
    role: UserRole = UserRole.OPERATOR
    tenant_id: str | None = None
    is_active: bool = True


class UserCreate(UserBase):
    """Properties to receive via API on creation."""
    password: str = Field(..., min_length=8, description="User password (min 8 chars)")


class UserUpdate(BaseModel):
    """Properties to receive via API on update."""
    name: str | None = Field(None, min_length=2)
    email: EmailStr | None = None
    role: UserRole | None = None
    is_active: bool | None = None
    password: str | None = Field(None, min_length=8, description="New password (optional)")


class UserResponse(UserBase):
    """Properties to return to client (excludes password_hash)."""
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    @computed_field  # type: ignore[misc]
    @property
    def organization_id(self) -> str | None:
        """Alias for tenant_id — matches frontend User type."""
        return self.tenant_id

    model_config = ConfigDict(from_attributes=True)


class UserListResponse(BaseModel):
    items: list[UserResponse]
    total: int


class ChangeOwnPasswordRequest(BaseModel):
    """Used by authenticated users to change their own password."""
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, description="New password (min 8 chars)")
