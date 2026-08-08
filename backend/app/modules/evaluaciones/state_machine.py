from fastapi import HTTPException, status

from app.modules.evaluaciones.models import Evaluacion
from app.shared.enums import EvaluacionEstado


VALID_TRANSITIONS: dict[str, set[str]] = {
    EvaluacionEstado.BORRADOR.value: {EvaluacionEstado.PUBLICADA.value},
    EvaluacionEstado.PUBLICADA.value: {
        EvaluacionEstado.EN_CALIFICACION.value,
        # Permite cerrar una evaluacion publicada sin entregas y conserva el endpoint existente.
        EvaluacionEstado.CERRADA.value,
    },
    EvaluacionEstado.EN_CALIFICACION.value: {
        EvaluacionEstado.PENDIENTE_REVISION.value,
        EvaluacionEstado.CERRADA.value,
    },
    EvaluacionEstado.PENDIENTE_REVISION.value: {EvaluacionEstado.CERRADA.value},
    # El docente conserva la autoridad para reabrir entregas después de un cierre.
    EvaluacionEstado.CERRADA.value: {EvaluacionEstado.EN_CALIFICACION.value},
}


def transition_evaluation_state(evaluacion: Evaluacion, target: EvaluacionEstado) -> None:
    current = evaluacion.estado
    target_value = target.value
    if target_value not in VALID_TRANSITIONS.get(current, set()):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Transicion de evaluacion invalida: {current} -> {target_value}",
        )
    evaluacion.estado = target_value
