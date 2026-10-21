# Plan: Encuesta flexible

**Rama**: `codex/111-encuesta-flexible` | **Fecha**: 2026-10-21 | **Spec**: [spec.md](./spec.md) | **Issue**: #230

## Resumen

Hotfix abreviado conforme a constitución: petición explícita aprobada, sin pausa adicional del plan. Archivar 5.0, publicar diagnóstico 5.1-web-flexible y software 5.2.0. Mantener intactos piloto, firmas, originales y servicios académicos.

## Contexto técnico

Python 3.11, WSGI, SQLite, JavaScript sin dependencias nuevas. Originales inmutables y eventos administrativos aditivos, sin migración de respuestas. Pruebas unittest, Node, navegador Chromium/WebKit y contenedor aislado. Móvil desde 360 px y escritorio; sin llamadas a IA ni datos reales de prueba.

## Verificación de la constitución

- Roles: no cambia autenticación administrativa ni CSRF.
- Integridad: archivo 5.0 exacto; contexto de cada constancia; ningún UPDATE de originales.
- Asincronía: mismo envío con timeout, UUID estable y confirmación exacta.
- Datos: omisión null; texto numérico breve conservado, excluido de métricas.
- Accesibilidad: campos text con inputmode decimal y ayuda no bloqueante, sin validación nativa de paso/rango para nuevos campos numéricos.
- Gobernanza: issue hotfix #230, spec aprobada por solicitud expresa, regresión, PR y CI protegido.

## Estructura y decisiones

`encuesta-docente/versions/5.0-web-medicion/` conserva settings/schema. Settings nuevos habilitan `flexible_answers` solo en diagnóstico 5.1. `submission.js` comparte lectura numérica entre formulario y administrador. `app.py` acepta número válido o texto corto, sin coerciones del paquete; desactiva dependencias solo para esta configuración del servidor. `measurement.py` admite nueva versión y cuenta solo mediciones completas. Docker incluye archivo 5.0. No se acepta eliminar consentimiento o desactivar controles de seguridad.

## Análisis de coherencia previo

Checklist 10/10 revisada, sin requisitos pendientes. FR-001 a FR-006 tienen tareas y pruebas, sin contradicciones ni incógnitas bloqueantes. Archivar antes de cambiar configuración, regresiones antes de implementar, luego navegador y contenedor. Entrega únicamente mediante CI verde.
