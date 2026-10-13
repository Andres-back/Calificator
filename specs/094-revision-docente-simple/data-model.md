# Modelo de datos reutilizado

Sin nuevas entidades persistidas ni migraciones.

- **CalificacionDetalle**: nota sugerida/confirmada, estado, evidencia, timeline y desglose actuales. La presentación respeta la decisión vigente.
- **GradeBreakdownData**: componentes, fórmula, ajuste global y motivo de ajuste existentes. Se diferencia puntaje total de nota escalada; no se modifica al consultar.
- **ReviewTriageSummary**: clasificación/prioridad y motivos existentes. Se cambia únicamente su descripción visible según estado.
- **Evidencia**: URL, páginas y relación actual con entrega/alumno/evaluación. Se conserva selección y visor.

## Reglas

1. Procesando: no presentar provisional como definitiva ni atribuir confirmación docente.
2. Pendiente: mantener avisos y destino de revisión; ausencia de aviso no certifica exactitud.
3. Confirmada/publicada: mostrar decisión vigente, historial original separado sin presumir resolución individual.
4. Consultar o abrir historial no escribe, recalcula, confirma o publica.
5. Editar puntaje, ajustar, confirmar/publicar y reanalizar usan contratos y permisos actuales; no introducir transiciones nuevas.
6. Motivos desconocidos se conservan internamente; su representación pública no copia identificadores o diagnóstico del proveedor.
