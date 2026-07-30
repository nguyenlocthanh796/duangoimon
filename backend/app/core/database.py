from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import settings

connect_args = {}
if "postgresql" in settings.database_url or "asyncpg" in settings.database_url:
    connect_args["statement_cache_size"] = 0

engine = create_async_engine(
    settings.database_url,
    echo=False,
    pool_size=10,
    max_overflow=3,
    pool_pre_ping=True,
    pool_recycle=1800,
    pool_timeout=30,
    connect_args=connect_args,
)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
