# Decisiones de diseño

Base inspeccionada: main `547bdee`, vigente tras PR #199. Investigación local de componentes y contratos; no nuevos proveedores ni tecnología a evaluar.

- **Decisión**: evolucionar materia/evaluaciones/boletín actuales. **Motivo**: la cabecera, selector de sección y múltiples acciones preceden al contenido útil. **Alternativa descartada**: nueva navegación global o rediseño del rol estudiante durante la demo.
- **Decisión**: conservar claridad y estructura 094 de nota/evidencia/respuestas/retroalimentación. **Motivo**: ya diferencia historial y tarea pendiente; repetir el rediseño añade riesgo. **Alternativa**: otra página de revisión, rechazada.
- **Decisión**: marcador local mínimo por usuario, siete días máximo y limpieza de sesión. **Motivo**: solo reabre navegación; no exige esquema nuevo ni transporta borradores. **Alternativas**: guardar fotos/notas o sincronización de sesiones entre dispositivos, fuera de alcance.
- **Decisión**: construir destino desde IDs validados y verificar permisos por APIs existentes. **Motivo**: el almacenamiento del navegador no da autoridad para abrir contenido. **Alternativa**: guardar/seguir URL arbitraria, rechazada.
- **Decisión**: contar IDs únicos del grupo según registros comprobados. **Motivo**: la carga actual excluye IDs con calificación/aceptación; una nota manual no prueba que exista foto. **Alternativa**: contar estados publicados o filas paginadas como fotos, rechazada.
- **Decisión**: propuesta siguiente de elección explícita. **Motivo**: la carga actual limpia identidad y hojas tras aceptar; conservar esa separación evita adjudicar otra foto al alumno equivocado. **Alternativa**: autoenvío o selección silenciosa, rechazada.
- **Decisión**: pruebas focalizadas y capturas sintéticas primero; CI completo obligatorio para merge. **Motivo**: proteger la demo y no consumir inferencias de IA para cambios visuales. **Alternativa**: pruebas repetidas sobre alumnos reales, rechazada.

Sin incógnitas técnicas pendientes. La validación de comprensión por un profesor real se recomienda después, sin presentarla como prueba ya realizada ni como permiso para alterar registros.
