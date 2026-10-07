# Contratos
Estudiantes: «Entregar accesos» con subjects.update, todos/algunos, recuento, copiar/CSV/print. Claves históricas vacías y explícitas; alta/renovación añade CSV con clave recién emitida. Advertir entrega individual privada, usuarios internos no buzones.
Libro: «Exportar notas», selector no borradores; abierta preseleccionada o todas; número alumnos/evaluaciones. Nuevas lecturas getMateriaEstudiantes/listEvaluaciones/listCalificaciones, comprobación de selección, sesión y permisos. Cualquier fallo impide archivo.
CSV BOM UTF-8, ;, comillas duplicadas, CRLF, texto protegido ante fórmulas/control, decimal coma; nombre archivo saneado. Nombre/usuario y tripleta nota/escala/estado por evaluación. Nota vacía pendiente, cero docente se conserva. Sin claves/fotos/feedback.
Sin nuevos endpoints ni mutaciones. Renovación individual existente permanece separada.

GET /evaluaciones/{id}/calificaciones?solo_lectura=true omite asignación automática de ceros; permisos y lista idénticos. Sin parámetro mantiene comportamiento vigente. Exportación requiere este modo de lectura.
