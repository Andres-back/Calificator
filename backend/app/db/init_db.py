from app.db.base import Base, import_models
from app.db.session import engine


async def init_db() -> None:
    import_models()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
