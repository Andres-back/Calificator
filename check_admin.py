import asyncio
import os

import asyncpg


async def main():
    conn = await asyncpg.connect(os.environ['DATABASE_URL'])
    rows = await conn.fetch("SELECT id, nombre, email, rol, estado FROM users WHERE rol = 'admin'")
    for row in rows:
        print(dict(row))
    print('---')
    users = await conn.fetch('SELECT id, nombre, email, rol, estado FROM users ORDER BY created_at')
    for user in users:
        print(dict(user))
    await conn.close()


asyncio.run(main())