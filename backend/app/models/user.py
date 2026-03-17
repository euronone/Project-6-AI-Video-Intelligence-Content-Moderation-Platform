import enum
from sqlalchemy import String, Boolean, Enum
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDMixin

class UserRole(str, enum.Enum):
    """Roles for RBAC."""
    ADMIN = "admin"
    OPERATOR = "operator"
    API_CONSUMER = "api_consumer"

class User(Base, UUIDMixin, TimestampMixin):
    """User entity for authentication and RBAC."""
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role_enum", native_enum=False), 
        default=UserRole.OPERATOR, 
        index=True, 
        nullable=False
    )
    tenant_id: Mapped[str | None] = mapped_column(String(255), index=True, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
