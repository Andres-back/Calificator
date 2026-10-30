# Estado de presentación

No se añaden tablas, campos persistentes, migraciones o endpoints.

- **Selección de componente**: reutiliza ID/clave canónica y parámetro `pregunta` actuales; posición anterior/siguiente se deriva de `breakdown.componentes`, no del número impreso ni del nombre de alumno.
- **Prioridad y nota**: solo lectura de los datos actuales; se mantiene el clasificador134 y el detalle académico existente. Un botón más pequeño no cambia cómo se evalúa.
- **Layout**: modo local `embedded` o `dialog`; el integrado delega al scroll del detalle y el modal conserva scroll acotado. No se almacena en sesión o cuenta.
- **Borradores**: se conservan propietarios, flags dirty/busy y confirmaciones existentes. Anterior/siguiente no son guardar/publicar ni otra vía para eludir un bloqueo.
- **Foco y teclado**: refs y dueños de desplazamiento transitorios; desaparecer/cambiar cuenta descarta resultados tardíos conforme a los consumidores actuales.

Los datos de calificaciones antiguas no se migran. La presentación funcionará con sus DTO existentes y no necesitará nuevas lecturas de IA.
