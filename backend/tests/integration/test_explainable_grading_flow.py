"""Integración de contratos públicos del flujo de calificación explicable.

La persistencia transaccional se cubre con PostgreSQL en la validación de la
migración y con pruebas de servicio; aquí se evita simular autenticación y se
comprueba que el ensamblado real de FastAPI publica únicamente los contratos
separados por rol.
"""

from app.core.config import settings
from app.main import create_app


def test_explainable_grading_routes_are_integrated_by_role():
    schema = create_app().openapi()
    paths = schema["paths"]

    assert "get" in paths["/api/calificaciones/{calificacion_id}/desglose"]
    assert "put" in paths["/api/calificaciones/{calificacion_id}/desglose"]
    assert "get" in paths["/api/calificaciones/{calificacion_id}/desglose/historial"]
    assert "get" in paths["/api/evaluaciones/{evaluacion_id}/mi-desglose"]
    assert "patch" in paths["/api/evaluaciones/{evaluacion_id}/respuestas-liberadas"]

    teacher_response = paths["/api/calificaciones/{calificacion_id}/desglose"]["get"]["responses"]["200"]
    student_response = paths["/api/evaluaciones/{evaluacion_id}/mi-desglose"]["get"]["responses"]["200"]
    assert "DesgloseDocenteRead" in str(teacher_response)
    assert "DesgloseEstudianteRead" in str(student_response)


def test_rollout_defaults_preserve_current_grade_authority():
    assert settings.EXPLAINABLE_GRADING_GENERATION_ENABLED is True
    assert settings.EXPLAINABLE_GRADING_AUTHORITY_ENABLED is False
