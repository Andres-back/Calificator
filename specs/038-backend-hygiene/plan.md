# Plan: Higiene incremental del backend

**Rama**: `codex/038-backend-hygiene` | **Fecha**: 2026-09-11 | **Spec**: [spec.md](./spec.md) | **Issue**: #78

## Resumen

Resolver únicamente los 22 hallazgos F401/F841 medidos en `backend/app` y `backend/tests`, revisar manualmente los casos que podrían tener efectos de importación y ampliar la barrera Ruff del CI. No se moverán rutas, servicios ni modelos; la reducción de módulos grandes queda documentada como siguiente fase.

## Contexto técnico

**Lenguajes/versiones**: Python 3.11, FastAPI, SQLAlchemy asíncrono y Pytest
**Dependencias**: Ruff fijado en dependencias de desarrollo; sin paquetes productivos nuevos
**Persistencia**: sin cambios de esquema ni escrituras de datos
**Pruebas**: Ruff F401/F821/F822/F823/F841, compilación, pruebas backend y gobernanza
**Plataforma objetivo**: backend web y CI Linux, compatible con desarrollo Windows
**Rendimiento y escala**: cero trabajo adicional en tiempo de ejecución; el control estático debe completar antes de las pruebas

## Verificación de la constitución

- Separación de roles: cumple; no se modifican guardas ni contratos.
- Integridad y trazabilidad: cumple; no se toca lógica de entrega, nota, publicación o historial.
- Asincronía e idempotencia: cumple; no se modifica el ciclo de vida de trabajos.
- Evolución de datos: cumple; no hay migraciones ni retiros de superficies.
- Datos y secretos: cumple; no se añaden valores de configuración ni datos reales.
- Accesibilidad: no aplica; no hay cambios visuales.
- Gobernanza y pruebas: cumple mediante issue #78, rama, aprobaciones, artefactos, pruebas, PR y CI.

## Estructura del proyecto

```text
.github/workflows/ci.yml
backend/app/**/*.py (solo archivos con F401/F841 medidos)
backend/tests/**/*.py (solo archivos con F401/F841 medidos)
scripts/check_spec_governance.py
tests/spec_governance/
specs/038-backend-hygiene/
specs/README.md
specs/system-inventory/current.json
```

## Decisiones y complejidad

- Cada hallazgo se revisará antes de eliminarse; no se aplicarán arreglos inseguros ni cambios de comportamiento.
- El control CI conservará F821/F822/F823 y añadirá F401/F841 en el mismo paso incremental.
- La línea base será cero hallazgos tanto en aplicación como en pruebas para evitar dos políticas distintas.
- Se registrarán los módulos mayores de mil líneas como candidatos de división, sin intervenirlos ahora.
- No se habilita Ruff completo: formato, complejidad y modernización requieren fases separadas.

## Verificación posterior al diseño

El plan preserva contratos, persistencia y autorización. Todos los cambios son eliminaciones locales de símbolos sin uso o configuración de calidad, y cualquier diferencia funcional obliga a revertir el hallazgo correspondiente.
