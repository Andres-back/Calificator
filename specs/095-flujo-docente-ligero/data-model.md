# Modelo reutilizado y marcador de navegación

## Registros existentes

Materia (identidad, grado, matrícula), evaluación (estado/modalidad), calificación (estado/nota) y evidencia conservan contratos, permisos e historial actuales. No hay transiciones nuevas de datos académicos ni migraciones.

## Marcador local propuesto

Registro versión 1: docente, materia, evaluación, alumno/calificación opcionales y fecha de consulta. Identificadores opacos, nunca nombres, respuestas, notas, credenciales ni archivos. Caduca a los siete días y se elimina al cerrar/perder sesión o cambiar de cuenta. Ignorar valores malformados, versión desconocida, fecha futura o almacenamiento denegado. No almacenar modo de carga ni reclamar recuperación de paquetes sin enviar.

El destino se construye desde rutas internas con IDs permitidos. El servidor sigue comprobando acceso: marcador inexistente/incorrecto no afecta inicio; contenido eliminado o acceso revocado descarta la referencia. Alumno no disponible retorna al grupo correspondiente con contexto válido.

## Progreso derivado

Total: alumnos únicos de la matrícula vigente. Atendidos: intersección con registros comprobados o aceptaciones exitosas de esta evaluación. Pendientes: elegibles de la lógica existente; no cambia esa política ni cuenta registros de otras materias/evaluaciones. «Registrado» no significa «Calificado» ni «Publicado». Si modalidad de evidencia es desconocida, el texto evita afirmar que hubo fotografía.

Propuesta siguiente: un pendiente del grupo/orden vigente, sin selección implícita. Solo se habilita con contexto verificado y sin envío activo ni paquete anterior; falla de carga/guardado no avanza progreso ni identidad. Cambiar alumno/evaluación conserva los bloqueadores existentes.
