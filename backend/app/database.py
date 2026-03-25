import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import text, event
from .config import get_settings

settings = get_settings()

# Auto-detect: if DATABASE_URL starts with postgresql, use asyncpg; else use SQLite
db_url = settings.database_url
is_sqlite = db_url.startswith("sqlite")

if is_sqlite:
    # Ensure data directory exists
    db_path = db_url.replace("sqlite+aiosqlite:///", "")
    os.makedirs(os.path.dirname(db_path) if os.path.dirname(db_path) else ".", exist_ok=True)

engine = create_async_engine(
    db_url,
    echo=False,
    **({"pool_size": 5, "max_overflow": 10} if not is_sqlite else {}),
)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db():
    async with async_session() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


async def run_migrations():
    migration_dir = os.path.join(os.path.dirname(__file__), "migrations")

    if is_sqlite:
        migration_path = os.path.join(migration_dir, "001_sqlite.sql")
    else:
        migration_path = os.path.join(migration_dir, "001_initial.sql")

    with open(migration_path, "r") as f:
        sql = f.read()

    async with engine.begin() as conn:
        if is_sqlite:
            # SQLite: execute statements one by one
            for stmt in sql.split(";"):
                stmt = stmt.strip()
                if stmt:
                    try:
                        await conn.execute(text(stmt))
                    except Exception as e:
                        if "already exists" not in str(e):
                            print(f"  ⚠️ {e}")
        else:
            await conn.execute(text(sql))

    print(f"✅ Database tables ready ({'SQLite' if is_sqlite else 'PostgreSQL'})")
