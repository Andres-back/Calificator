"""Spec 189: el promedio del reporte docente va en escala 5, como el del estudiante."""
import asyncio
from types import SimpleNamespace
from uuid import uuid4

from app.modules.reportes import router as reportes


class FakeDb:
    def __init__(self, rows):
        self.rows = rows
        self.sql = ''

    async def execute(self, statement, params):
        self.sql = str(statement)
        return self.rows


def test_189_the_average_is_normalized_to_scale_5(monkeypatch):
    monkeypatch.setattr(reportes, 'require_permission_now', lambda *_: None)
    db = FakeDb([SimpleNamespace(nombre='Ciencias', total_cals=4, promedio=0.875)])
    result = asyncio.run(reportes.resumen_profesor(current_user=SimpleNamespace(id=uuid4()), db=db))
    assert 'nota_confirmada * 5.0 / NULLIF(e.nota_maxima, 0)' in db.sql
    assert 'JOIN evaluaciones e' in db.sql
    assert result['materias'] == [{'nombre': 'Ciencias', 'total_calificaciones': 4, 'promedio': 0.875, 'escala': 5}]
