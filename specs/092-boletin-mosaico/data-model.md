# Modelo de lectura: boletín docente

Sin tablas, migraciones ni entidades persistidas nuevas. Dominio propietario: 008.

## Entidades reutilizadas

- Materia: identidad, nombre y padrón autorizado ya usado por `MateriaContext`.
- Alumno: `id`, nombre completo y correo disponible. La identidad es `id`, nunca nombre o posición. Iniciales locales, sin fotos nuevas.
- Evaluación: `id`, nombre, `nota_maxima`, estado; solo no borrador.
- Calificación: contrato vigente `Calificacion`; última calificación, nota/escala y promedio según `buildFollowUpRows`, sin modificar valores ni reglas.

## Estado de lectura

| Lectura | Presentación | Restricción |
| --- | --- | --- |
| Deshabilitada por permisos | Acceso restringido | No inferir notas ni ausencia |
| Carga necesaria pendiente | Cargando notas | No boletín falsamente completo |
| Error necesario | Error/reintento | No mostrar «Sin calificación» |
| Éxito vacío | Sin calificación | Ausencia real, no cero |
| Éxito con datos | Resultado vigente | Usar el significado del estado |

## Presentación académica

| Resultado existente | Texto | Nota |
| --- | --- | --- |
| Decidida y publicada | Publicada | Decidida/escala |
| Decidida sin publicar | Confirmada · sin publicar | Decidida/escala |
| Por revisar | Sugerencia IA · pendiente de revisión | Sugerencia explícitamente no definitiva |
| Calificando | Calificando | Sin nota numérica |
| Sin nota | Sin calificación | Ausencia, no cero |

Los valores de cero y las centésimas se preservan. No hay transiciones académicas causadas por consultar.

## Selección temporal

- Búsqueda, filtro y evaluación seleccionada permanecen durante apertura/cierre.
- Selección `{materiaId, userId, studentId}` o ninguna. Validar usuario, permiso y matrícula antes de mostrar; descartar al cambiar ámbito.
- Guardar identidad, no copia de notas: resultados nuevos se proyectan desde las consultas vigentes.
- Abrir habilita lecturas necesarias de todas las evaluaciones; cerrar conserva filtros y scroll, sin borrar caché ni matrículas.
- Exportación y previsualización no se apilan.
