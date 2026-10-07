# Investigación

## Enmienda #190
- Decisión: reutilizar la renovación individual autorizada, una solicitud por alumno sin reintentar automáticamente. Motivo: el endpoint ya invalida sesiones y obliga a cambiar clave; no se almacenan contraseñas recuperables. Alternativa descartada: exponer hashes como claves, cifrar contraseñas personales o generar claves al descargar. Fallo incierto requiere aviso y consentimiento nuevo.
- Decisión: claves emitidas solo en memoria y descarga inmediata en alta por foto/manual. Motivo: resultado de confirmación ya entrega contraseñas una vez. Alternativa descartada: persistencia en caché/storage para descargarlas después.
- Decisión: cambiar solo la matriz de columnas del exportador existente. Motivo: formato mínimo aprobado y menor exposición de datos; se preserva la fuente de decisión docente. Alternativa descartada: nuevo endpoint o cálculo de notas duplicado.
- Decisión: pendientes vacíos, sin columna de estado, con aviso en diálogo. Motivo: no inventar notas ni añadir columnas no solicitadas. Alternativa descartada: exportar sugerencias o cero provisional.
- Decisión: sufijo ordinal solo para encabezados duplicados, evitando colisiones con nombres presentes. Motivo: columnas identificables sin renombrar evaluaciones. Los homónimos continúan por identidad interna en filas separadas.
- Decisión: consultas autorizadas existentes y buildFollowUpRows. Motivo: misma última nota/hasTeacherDecision, cero real y estados del libro; evita algoritmo duplicado. Alternativa descartada: exportar sugerencia sin decisión.
- Decisión: CSV local seguro. Motivo: aprobación CSV, sin dependencia ni DB. Alternativa: XLSX no requerido.
- Decisión: RosterCredentials reutilizado para cuentas sin clave y nuevas claves efímeras. Motivo: servidor solo hashes; print portal ya privado. Alternativa: guardar claves para recuperarlas viola privacidad.
- Decisión: lecturas frescas, concurrencia máxima tres. Motivo: selección independiente de filtros sin saturar API; todo o error.
Sin incógnitas pendientes. No investigadores delegados necesarios.
