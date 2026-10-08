# Contratos existentes afectados

## Recursos

- `GET /api/herramientas/:id`: conservar `MaterialRead` exterior y restricciones de matrícula/publicación. Estudiante de actividad recibe contenido seguro por tipo; docente autor y apoyo autorizado conservan sus visores legítimos.
- `GET /api/herramientas/:id/pdf`: sin soluciones para estudiante; aceptar máscara segura de crucigrama conservando casillas y pistas. `soluciones=true` continúa denegado a no autores.
- `/app/recursos/:id`: apoyo ofrece práctica; actividad interactiva ofrece una única acción de resolver en `/app/evaluaciones/:id/resolver`, sin formulario paralelo. Actividad no interactiva permite lectura y entrega contextual. Si falta evaluación enlazada, mostrar estado no disponible, no enlace inválido.

## Resultados

- `/app/calificaciones/boletin` y `/app/materias/:id/boletin`: solo variantes estudiantiles usan la tarjeta compartida. Nota publicada: evaluación, nota/escala, estado, acceso a explicación y feedback progresivo. Pendiente: no cero inventado ni etiqueta definitiva. Cero confirmado: mostrar 0 y permitir explicación.
- Acción: enlace a `/app/evaluaciones/:id/resolver` con ancla de resultado estable, sin pasar id de otros alumnos ni tocar intentos. Autorizar lectura como actualmente; un recurso inaccesible muestra denegación sin ampliar permisos.
- `GET /api/evaluaciones/:id/mi-desglose`: conservar respuesta autorizada o null y validación de identidad. Carga → indicador; éxito con datos → explicación existente; éxito null → mensaje neutral con nota/feedback original; error → aviso veraz; reintento → repetir solo consulta. Nunca inferir nota histórica de un fallo de red o servicio.

No hay nuevas rutas, endpoints, respuestas esperadas visibles, permisos o mutaciones académicas.
