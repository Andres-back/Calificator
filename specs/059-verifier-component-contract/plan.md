# Plan: revisión fiable de discrepancias por pregunta

**Rama**: `codex/059-verifier-component-contract` | **Fecha**: 2026-09-21 | **Spec**: [spec.md](spec.md) | **Issue**: [#117](https://github.com/Andres-back/Calificator/issues/117)

## Implementación

Normalizar la salida compacta del verificador en `agents.py` contra las claves del blueprint. En `breakdown_policy.py`, evitar una puntuación definitiva cuando los evaluadores divergen materialmente o una alerta específica cuestiona el puntaje o la clave; mantener la validación objetiva verdadera como autoridad. En `breakdown_service.py`, identificar solo alertas de conflicto con número de pregunta y trasladarlas al consenso; conservar las alertas globales como bloqueo de revisión sin atribuirlas a una pregunta equivocada.

## Verificación

Pruebas focalizadas del cliente simulado, consenso y persistencia; Ruff, inventario y gobernanza. Tras PR y CI, repetir la foto demo en producción y comprobar que la pregunta 3 ya no sea un cero seguro. No confirmar ni publicar ninguna nota.

## Constitución

La solución preserva la separación de roles, trazabilidad por componente, revisión humana, idempotencia y proveedores actuales. Sin migración ni ampliación de datos personales.
