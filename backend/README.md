# XCalificator Backend

Backend FastAPI modular para las fases 1 y 2 de XCalificator:

- Autenticacion con JWT en cookies `httpOnly`.
- Usuarios con roles `admin`, `profesor` y `estudiante`.
- Materias con codigo unico de matricula.
- Matricula de estudiantes por codigo.
- Catalogo DBA.
- Evaluaciones `nativa`, `externa_digitalizada` y `sorpresa`.
- `EvaluationBlueprint` obligatorio para cada evaluacion.
- Migracion inicial Alembic con PostgreSQL y `pgvector`.

## Ejecutar en local con Docker

```bash
docker compose up --build
docker compose exec backend alembic upgrade head
```

Para usar variables locales propias, crea `backend/.env` y ejecuta Docker Compose con
`BACKEND_ENV_FILE=./backend/.env`.

API:

```txt
http://localhost:8000/health
http://localhost:8000/docs
```

## Ejecutar sin Docker

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

## Pruebas

```bash
cd backend
pytest
```

Si las dependencias no estan instaladas, las pruebas unitarias puras siguen sirviendo para validar generacion de codigos y construccion de blueprints.
