"""
Shared test fixtures.

Uses an in-memory SQLite database (via aiosqlite) so tests run without a
running PostgreSQL or Redis instance. Redis is mocked via fakeredis.
"""
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.dependencies import get_db, get_redis
from app.main import app
from app.models.base import Base

# ── In-memory SQLite engine for tests ────────────────────────────────────────

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture(scope="function")
async def db_engine():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def db_session(db_engine):
    factory = async_sessionmaker(bind=db_engine, expire_on_commit=False, autoflush=False)
    async with factory() as session:
        yield session


@pytest_asyncio.fixture(scope="function")
async def redis_client():
    """Fake async Redis client."""
    try:
        import fakeredis.aioredis as fakeredis
        client = fakeredis.FakeRedis(decode_responses=True)
        yield client
        await client.aclose()
    except ImportError:
        pytest.skip("fakeredis not installed — skipping Redis-dependent tests")


@pytest_asyncio.fixture(scope="function")
async def client(db_session, redis_client):
    """AsyncClient with overridden DB and Redis dependencies."""

    async def _get_db():
        yield db_session

    async def _get_redis():
        yield redis_client

    app.dependency_overrides[get_db] = _get_db
    app.dependency_overrides[get_redis] = _get_redis

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac

    app.dependency_overrides.clear()
