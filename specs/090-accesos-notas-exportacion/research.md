# Investigación
- Decisión: consultas autorizadas existentes y buildFollowUpRows. Motivo: misma última nota/hasTeacherDecision, cero real y estados del libro; evita algoritmo duplicado. Alternativa descartada: exportar sugerencia sin decisión.
- Decisión: CSV local seguro. Motivo: aprobación CSV, sin dependencia ni DB. Alternativa: XLSX no requerido.
- Decisión: RosterCredentials reutilizado para cuentas sin clave y nuevas claves efímeras. Motivo: servidor solo hashes; print portal ya privado. Alternativa: guardar claves para recuperarlas viola privacidad.
- Decisión: lecturas frescas, concurrencia máxima tres. Motivo: selección independiente de filtros sin saturar API; todo o error.
Sin incógnitas pendientes. No investigadores delegados necesarios.
