# Modelo de presentación

Sin tablas, modelos persistentes ni migraciones nuevas.

## FeedbackView

- Texto original, borrador y permiso del workspace actual.
- Lectura → editar por acción explícita; editar → lectura al guardar o descartar con confirmación si hay cambios.
- Error conserva borrador/modo. Consultar no guarda ni altera contenido, incluidos prefijos provisionales. Guardas actuales al cambiar alumno/sección.

## GradeCalculationPresentation

- Fuente: calificación, desglose, cobertura, componentes y decisión existentes.
- Derivados: count sin puntos (null), tipo pregunta/criterio, cálculo provisional/revisión pendiente/completo y diferencia finita.
- Cero es evaluado, no pendiente. Sin desglose no inventar cálculo; sugerida/confirmada conservan identidad y versiones.

## EditableScoreText

- Valor y máximo originales existentes.
- Inicial/referencia dirty sin ceros finales: null vacío, 0.6250 → 0.625, nunca 0.63.
- Texto transitorio durante escritura; guardar valida finitud, rango exacto, estado y explicaciones actuales. No guardar por montaje/formato.

## HomeScreenGuideState

- Guía abierta/cerrada y pestaña Android/iPhone seleccionable; agente del navegador solo elige guía inicial, no permisos.
- Detección standalone actual oculta botón. No persistir ni registrar instalación por leer instrucciones.
- Cerrar vuelve al disparador o menú de cuenta; sin datos académicos, claves, eventos de instalación ni llamadas API.
- Icono reutiliza bootstrap/roles existentes. No cambia sesión ni rutas.
