"""Synthetic persistence/concurrency only; never falls back to configured production DB."""
import json
import os
from pathlib import Path
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db.base import import_models
from app.modules.materias.models import Materia
from app.modules.users.models import User
from app.modules.xali import service
from app.modules.xali.teacher_context import authorize_context, lock_conversation
from app.modules.xali.visual_content import split_response, wire_response

TEST_URL = os.getenv('SPEC104_TEST_DATABASE_URL')
pytestmark = pytest.mark.skipif(not TEST_URL, reason='Requiere SPEC104_TEST_DATABASE_URL aislada')
import_models()


def engine_for_test():
    assert TEST_URL and ('127.0.0.1:' in TEST_URL or '@localhost:' in TEST_URL)
    assert TEST_URL.rsplit('/', 1)[-1] in ('spec104', 'xcalificator_test')
    return create_async_engine(TEST_URL)


@pytest.mark.asyncio
async def test_scoped_metadata_history_and_nonblocking_locks(monkeypatch):
    engine = engine_for_test()
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    corpus = json.loads((Path(__file__).resolve().parents[3] / 'specs/104-xali-docente-visual/fixtures/visuales.json').read_text(encoding='utf8'))
    prompts = []

    class Router:
        def __init__(self, **kwargs):
            pass

        async def generate_text(self, feature, prompt):
            assert feature == 'xali_chat'
            prompts.append(prompt)
            return wire_response('Explicación sintética.', {'version': 1, 'visuales': [corpus['validos'][3]]})

    async def no_rag(*args):
        return 'Sin materiales.', []

    monkeypatch.setattr(service, 'LLMRouter', Router)
    monkeypatch.setattr(service, 'retrieve_context', no_rag)
    try:
        async with sessions() as db:
            # Whole academic rows, not only counts: this feature must not mutate them.
            academic_before = {}
            for table in ['calificaciones', 'entregas', 'evaluaciones']:
                academic_before[table] = await db.scalar(text(f'SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id), \'[]\'::jsonb) FROM {table} t'))
            teacher = User(nombre='Docente sintético', email=f'{uuid4()}@example.test', password_hash='no-login', rol='profesor')
            other = User(nombre='Otro docente', email=f'{uuid4()}@example.test', password_hash='no-login', rol='profesor')
            db.add_all([teacher, other]); await db.flush()
            subject = Materia(profesor_id=teacher.id, nombre='Matemáticas', area='Matemáticas', grado='6', codigo_matricula=uuid4().hex[:12])
            second = Materia(profesor_id=teacher.id, nombre='Lenguaje', area='Lenguaje', grado='4', codigo_matricula=uuid4().hex[:12])
            db.add_all([subject, second]); await db.commit()
            assert (await authorize_context(db, teacher, subject.id)).id == subject.id
            with pytest.raises(HTTPException) as denied:
                await authorize_context(db, other, subject.id)
            assert denied.value.status_code == 403
            answer = await service.chat(db, estudiante_id=teacher.id, materia_id=subject.id, mensaje='Explica coordenadas', is_teacher=True, teacher_materia=subject)
            assert len(split_response(answer)[1]['visuales']) == 1
            assert 'Matemáticas' in prompts[0] and 'Consulta del docente' in prompts[0] and 'Pregunta del estudiante' not in prompts[0]
            await service._save_chat_exchange(db, estudiante_id=teacher.id, materia_id=None, mensaje='General', respuesta='Texto general anterior.')
            await service._save_chat_exchange(db, estudiante_id=teacher.id, materia_id=second.id, mensaje='Lenguaje', respuesta='Texto de Lenguaje.')
            own_id, subject_id, second_id = teacher.id, subject.id, second.id
        async with sessions() as fresh:
            history = await service.get_history(fresh, own_id, subject_id)
            assert len(history) == 2
            restored = next(row['mensaje'] for row in history if row['role'] == 'assistant')
            assert split_response(restored)[1]['visuales'] == split_response(answer)[1]['visuales']
            assert [m['mensaje'] for m in await service.get_history(fresh, own_id, None)] == ['General', 'Texto general anterior.']
            await service.clear_history(fresh, own_id, None)
            assert await service.get_history(fresh, own_id, None) == []
            assert len(await service.get_history(fresh, own_id, subject_id)) == 2
            assert len(await service.get_history(fresh, own_id, second_id)) == 2
            language = await fresh.get(Materia, second_id)
            await service.chat(fresh, estudiante_id=own_id, materia_id=second_id, mensaje='Prepara una actividad', is_teacher=True, teacher_materia=language)
            assert '"nombre": "Lenguaje"' in prompts[-1] and '"grado": "4"' in prompts[-1]
            assert 'Texto general anterior.' not in prompts[-1] and 'Explica coordenadas' not in prompts[-1]
        async with sessions() as first, sessions() as second_connection:
            await lock_conversation(first, own_id, subject_id)
            for action in [lambda: lock_conversation(second_connection, own_id, subject_id), lambda: service.clear_history(second_connection, own_id, subject_id)]:
                with pytest.raises(HTTPException) as conflict:
                    await action()
                assert conflict.value.status_code == 409
                await second_connection.rollback()
            await lock_conversation(second_connection, own_id, second_id)
            await second_connection.rollback()
            await first.rollback()
            await lock_conversation(second_connection, own_id, subject_id)
            await second_connection.rollback()
        async with sessions() as db:
            count = await db.scalar(text('SELECT count(*) FROM chat_messages WHERE student_id=:id'), {'id': own_id})
            assert count == 6
            for table, before in academic_before.items():
                assert await db.scalar(text(f'SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id), \'[]\'::jsonb) FROM {table} t')) == before

        async def unavailable(*args, **kwargs):
            raise RuntimeError('Synthetic model failure')
        monkeypatch.setattr(Router, 'generate_text', unavailable)
        async with sessions() as db:
            materia = await db.get(Materia, subject_id)
            with pytest.raises(RuntimeError):
                await service.chat(db, estudiante_id=own_id, materia_id=subject_id, mensaje='Fallo', is_teacher=True, teacher_materia=materia)
            assert len(await service.get_history(db, own_id, subject_id)) == 2
            async with sessions() as other_db:
                await lock_conversation(other_db, own_id, subject_id)
                await other_db.rollback()

        from app.modules.xali import teacher_context
        async def broken_query(db, *args, **kwargs):
            await db.execute(text('SELECT no_such_column_spec104'))
        monkeypatch.setattr(teacher_context, 'build_context_for_xali', broken_query)
        async with sessions() as db:
            materia = await db.get(Materia, subject_id)
            _, sources = await teacher_context.retrieve_context(db, materia, 'Fallo sintético de RAG')
            assert sources == []
            assert await db.scalar(text('SELECT 1')) == 1
    finally:
        await engine.dispose()
