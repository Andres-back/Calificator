from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base
from app.shared.enums import DemoEstado

class Demo(Base):
    __tablename__ = "demos"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    estado: Mapped[str] = mapped_column(String, default=DemoEstado.ACTIVO.value, index=True)