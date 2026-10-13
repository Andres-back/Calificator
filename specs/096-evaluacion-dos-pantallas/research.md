# Investigación local y decisiones

Base: main `9bc4455`. Inspección de GenerationWizard/modelo, PasosGuia, API, accesos de materia/general y pruebas. Sin tecnología nueva ni incertidumbres de integración pendientes.

- **Decisión**: evolucionar el asistente actual. **Motivo**: ya agrega validación 1–4 al generar, revisa en 5 y guarda con PATCH en 6. **Alternativa descartada**: creador paralelo con otro estado/reglas/transporte.
- **Decisión**: mantener claves v7 normalizando etapas. **Motivo**: borradores por cuenta/materia de siete días; nueva clave rompería continuidad. **Alternativa**: reiniciar todos, rechazada.
- **Decisión**: nombre automático solo nuevo/no personalizado usando descripción como tema vigente. **Motivo**: payload admite tema sin esquema nuevo. **Alternativa**: nuevo campo backend obligatorio, fuera de alcance.
- **Decisión**: cantidad con resumen y personalización. **Motivo**: cuatro tipos y criterios seleccionados ya tienen validaciones; ocultar navegación no elimina selección. **Alternativa**: todos los criterios/reparto invisible, rechazada.
- **Decisión**: contenido editable en revisión; documentos finales tras guardar. **Motivo**: getEvaluationDocument consulta servidor, no ediciones locales. **Alternativa**: PDF previo presentado como actualizado o peticiones por pulsación, rechazada.
- **Decisión**: PATCH diferencial/versionado y editor de criterios vigente. **Motivo**: solo rúbrica no debe round-trip preguntas ni quitar metadatos. **Alternativa**: siempre reenviar evaluación completa, rechazada.
- **Decisión**: selector con callbacks autorizados. **Motivo**: reutilizar diálogos existentes sin duplicar formularios/rutas. **Alternativa**: otro centro de creación, rechazado.
- **Decisión**: fixtures y regresiones focalizadas primero; CI completo antes de merge. **Motivo**: demo estable sin consumo real de IA ni alumnos. **Alternativa**: pruebas repetidas en producción, rechazada.

La comprensión docente y teclado físico se pueden evaluar después; no se presentan como ensayos realizados ni bloquean este diseño por no existir todavía.
