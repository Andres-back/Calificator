# Checklist de calidad: Recuperación de trabajos de IA

**Propósito**: validar el hotfix antes de implementar  
**Creado**: 2026-08-26  
**Especificación**: [spec.md](../spec.md)

## Calidad y alcance

- [x] Describe impacto, reproducción y recuperación sin detalles sensibles.
- [x] Todos los requisitos son verificables y no quedan aclaraciones pendientes.
- [x] Los estados terminales, la idempotencia y la preservación de evidencia están definidos.
- [x] El alcance excluye cancelar o duplicar trabajos `running`.
- [x] Los criterios de éxito incluyen regresión PostgreSQL y doble ejecución.
- [x] El hotfix conserva contratos públicos y propiedad del dominio 012.

## Aprobación

- [x] El usuario autorizó recuperar el trabajo y exigió que el incidente no pueda repetirse.
