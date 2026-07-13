from typing import Any

from app.shared.enums import BlueprintNivelContexto, EvaluacionTipoOrigen


def infer_blueprint_level(tipo_origen: str) -> BlueprintNivelContexto:
    if tipo_origen == EvaluacionTipoOrigen.EXTERNA_DIGITALIZADA.value:
        return BlueprintNivelContexto.RECONSTRUIDO
    if tipo_origen == EvaluacionTipoOrigen.SORPRESA.value:
        return BlueprintNivelContexto.MINIMO
    return BlueprintNivelContexto.COMPLETO


def normalize_dba_records(dba_records: list[Any]) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    for record in dba_records:
        if hasattr(record, "enunciado"):
            enunciado = str(record.enunciado)
            normalized.append(
                {
                    "id": str(record.id),
                    "fuente": "personalizado",
                    "area": record.area,
                    "grado": record.grado,
                    "codigo": None,
                    "descripcion": enunciado,
                    "enunciado": enunciado,
                    "evidencias_aprendizaje": record.evidencias_aprendizaje,
                    "ejemplo": record.ejemplo,
                }
            )
            continue
        descripcion = str(record.descripcion)
        normalized.append(
            {
                "id": str(record.id),
                "fuente": "oficial",
                "area": record.area,
                "grado": record.grado,
                "codigo": record.codigo,
                "descripcion": descripcion,
                "enunciado": descripcion,
                "evidencias": [],
            }
        )
    return normalized


def build_blueprint_payload(
    *,
    evaluacion_id: Any,
    tipo_origen: str,
    dba_records: list[Any],
    metas: list[str],
    criterios: list[dict[str, Any]],
    preguntas: list[dict[str, Any]] | None = None,
    respuestas_esperadas: list[dict[str, Any]] | None = None,
    errores_comunes: list[str] | None = None,
    contexto_rag: list[dict[str, Any]] | None = None,
    reglas_feedback: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return {
        "evaluacion_id": evaluacion_id,
        "nivel_contexto": infer_blueprint_level(tipo_origen).value,
        "dba": normalize_dba_records(dba_records),
        "metas": metas,
        "criterios": criterios,
        "preguntas": preguntas or [],
        "respuestas_esperadas": respuestas_esperadas or [],
        "errores_comunes": errores_comunes or [],
        "contexto_rag": contexto_rag or [],
        "reglas_feedback": reglas_feedback or {},
    }


def evaluation_to_grading_blueprint(evaluacion: Any) -> dict[str, Any]:
    blueprint = evaluacion.blueprint
    return {
        "nombre": evaluacion.nombre,
        "nota_maxima": float(evaluacion.nota_maxima),
        "dba": blueprint.dba if blueprint else [],
        "metas": blueprint.metas if blueprint else evaluacion.metas_profesor,
        "criterios": blueprint.criterios if blueprint else evaluacion.criterios,
        "preguntas": blueprint.preguntas if blueprint else evaluacion.preguntas,
        "respuestas_esperadas": (
            blueprint.respuestas_esperadas if blueprint else evaluacion.respuestas_esperadas
        ),
        "errores_comunes": blueprint.errores_comunes if blueprint else [],
        "contexto_rag": blueprint.contexto_rag if blueprint else [],
        "reglas_feedback": blueprint.reglas_feedback if blueprint else {},
    }
