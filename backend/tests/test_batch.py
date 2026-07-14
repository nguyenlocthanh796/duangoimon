import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class _Base(DeclarativeBase):
    pass


class _Item(_Base):
    __tablename__ = "_test_batch_item"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column()
    deleted_at: Mapped[str | None] = mapped_column(default=None, nullable=True)


# Override: _Item.soft_delete check: if model has a 'deleted_at' attr in the
# _sa_instance_state, our batch module's `hasattr(model, "deleted_at")` works.
# For hard-delete tests we use soft=False explicitly.


@pytest.fixture()
async def db():
    """Per-test in-memory SQLite with clean tables."""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        echo=False,
    )
    async with engine.begin() as conn:
        await conn.run_sync(_Base.metadata.create_all)
    async with async_sessionmaker(engine, expire_on_commit=False)() as session:
        yield session
    await engine.dispose()


class TestBatch:
    async def test_batch_create(self, db: AsyncSession):
        from app.core.batch import batch_create

        items = [_Item(name=f"Item {i}") for i in range(3)]
        created = await batch_create(db, _Item, items)
        assert len(created) == 3
        for c in created:
            assert c.id is not None

    async def test_batch_update(self, db: AsyncSession):
        from app.core.batch import batch_create, batch_update

        items = [_Item(name="Old") for _ in range(2)]
        created = await batch_create(db, _Item, items)
        ids = [c.id for c in created]
        updated = await batch_update(db, _Item, ids, {"name": "New"})
        assert updated == 2
        result = await db.execute(select(_Item))
        rows = result.scalars().all()
        assert all(r.name == "New" for r in rows)

    async def test_batch_soft_delete(self, db: AsyncSession):
        from app.core.batch import batch_create, batch_delete

        items = [_Item(name="Del") for _ in range(2)]
        created = await batch_create(db, _Item, items)
        ids = [c.id for c in created]
        deleted = await batch_delete(db, _Item, ids, soft=True)
        assert deleted == 2
        result = await db.execute(select(_Item))
        rows = result.scalars().all()
        assert all(r.deleted_at is not None for r in rows)

    async def test_batch_hard_delete(self, db: AsyncSession):
        from app.core.batch import batch_create, batch_delete

        items = [_Item(name="HardDel") for _ in range(2)]
        created = await batch_create(db, _Item, items)
        ids = [c.id for c in created]
        deleted = await batch_delete(db, _Item, ids, soft=False)
        assert deleted == 2
        result = await db.execute(select(_Item))
        rows = result.scalars().all()
        assert len(rows) == 0

    async def test_batch_empty_ids(self, db: AsyncSession):
        from app.core.batch import batch_delete, batch_update

        assert await batch_update(db, _Item, [], {"name": "X"}) == 0
        assert await batch_delete(db, _Item, [], soft=False) == 0
