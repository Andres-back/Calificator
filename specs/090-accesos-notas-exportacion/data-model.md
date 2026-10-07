# Datos
Entrega efímera: estudiante_id, nombre, email, password_temporal opcional. Selección IDs; claves solo desde RosterConfirmation recién recibida; nunca persistidas. Sesión cambiada bloquea y cierre desmonta.
Libro: materia y matrícula existentes, evaluaciones no borrador, calificaciones por evaluación. FollowUpCell: score nullable, maximumScore, status decidida/por_revisar/calificando/sin_nota; misma última calificación que libro.
Estados UI: selección → cargando → descargado/error. Reintento solo lectura. Sin nuevos modelos/tablas/migraciones.
