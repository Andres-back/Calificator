# Plan de hotfix

Python/FastAPI/SQLAlchemy existentes. Sin nuevas dependencias ni migraciones.

1. Añadir regresión de endpoint sobre PostgreSQL aislado, con revisión digitalizada y foto/PDF. La cola se sustituye por un doble que comprueba persistencia y acepta sin IA. Registrar el fallo previo.
2. Construir la entrega nueva con el tipo normalizado del paquete antes de `db.add`, tanto en el envío docente como en el envío físico del estudiante donde se repite la misma omisión; mantener fijación de revisión, almacenamiento, permisos y lógica de reemplazo existentes. No usar `no_autoflush` para ocultar una entidad inválida.
3. Cubrir también la invariante en la prueba unitaria y ejecutar regresiones de foto, lote, evaluación mixta, contexto visual y permisos. Revisar las otras construcciones de Entrega para confirmar que no omiten el tipo.
4. PR de hotfix, gobernanza y todos los controles CI verdes. Fusión con HEAD exacto, sin bypass. Verificar despliegue automático, hash del router y salud; no tocar datos reales, claves ni modelos. Si no despliega, diagnosticar antes de cualquier acción adicional.

Constitución: aprobación expresa del alcance de reparación; hotfix permite omitir solo la pausa del plan. Permisos, trazabilidad, CI y main protegida se mantienen. Los borradores de Spec 034, 115 y 116 no se incluyen en el PR.

Rollback: revertir este commit mediante PR si aparece regresión; no hay datos que revertir.
