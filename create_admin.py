import asyncio
import os
import uuid

import asyncpg
from pwdlib import PasswordHash


async def main():
    database_url = os.environ['DATABASE_URL']
    admin_email = os.environ['ADMIN_EMAIL']
    admin_password = os.environ['ADMIN_PASSWORD']
    admin_name = os.getenv('ADMIN_NAME', 'Administrador')

    conn = await asyncpg.connect(database_url)
    password_hash = PasswordHash.recommended().hash(admin_password)
    existing_id = await conn.fetchval('SELECT id FROM users WHERE email = $1', admin_email)
    if existing_id:
        await conn.execute(
            "UPDATE users SET password_hash = $1, rol = 'admin', estado = 'activo' WHERE email = $2",
            password_hash,
            admin_email,
        )
        print('Updated administrator credentials')
    else:
        new_id = uuid.uuid4()
        await conn.execute(
            """INSERT INTO users (id, nombre, email, password_hash, rol, estado, created_at, updated_at)
               VALUES ($1, $2, $3, $4, 'admin', 'activo', NOW(), NOW())""",
            new_id,
            admin_name,
            admin_email,
            password_hash,
        )
        print(f'Created administrator with id {new_id}')
    await conn.close()


asyncio.run(main())