from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash
from app.modules.users.models import User
from app.modules.users.schemas import UserCreate, UserSelfUpdate, UserUpdate
from app.shared.enums import UserEstado


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    return await db.scalar(select(User).where(User.email == email.lower()))


async def get_user_or_404(db: AsyncSession, user_id: UUID) -> User:
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


async def list_users(db: AsyncSession) -> list[User]:
    result = await db.scalars(select(User).order_by(User.created_at.desc()))
    return list(result)


async def create_user(db: AsyncSession, payload: UserCreate) -> User:
    existing = await get_user_by_email(db, payload.email)
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        nombre=payload.nombre,
        email=payload.email.lower(),
        password_hash=get_password_hash(payload.password),
        rol=payload.rol.value,
        estado=UserEstado.ACTIVO.value,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def update_user(db: AsyncSession, user: User, payload: UserUpdate | UserSelfUpdate) -> User:
    data = payload.model_dump(exclude_unset=True)
    if "email" in data and data["email"]:
        email = data["email"].lower()
        existing = await get_user_by_email(db, email)
        if existing and existing.id != user.id:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
        user.email = email
    if "nombre" in data and data["nombre"] is not None:
        user.nombre = data["nombre"]
    if "password" in data and data["password"]:
        user.password_hash = get_password_hash(data["password"])
    if "rol" in data and data["rol"] is not None and hasattr(payload, "rol"):
        user.rol = data["rol"].value
    if "estado" in data and data["estado"] is not None and hasattr(payload, "estado"):
        user.estado = data["estado"].value

    await db.commit()
    await db.refresh(user)
    return user


async def delete_user(db: AsyncSession, user: User) -> None:
    await db.delete(user)
    await db.commit()
