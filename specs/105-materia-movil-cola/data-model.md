# Estados de presentación

No se añaden tablas ni contratos públicos.

## Borrador de materia

Valores existentes: nombre, área, grado y descripción. Estados: cerrado, abierto, escribiendo, enviando, error y éxito. Presentación: opciones plegadas/desplegadas y viewport móvil. Plegar, terminar escritura o cambiar tamaño conserva valores; solo confirmar un formulario válido inicia el alta.

## Monitor de calificación

Trabajo existente: ID, materia, evaluación, estudiante, estado e incidencias. Estados reales conservados: pendiente, ejecutando, reintentando y terminales según contrato actual. La presentación compacta/detallada es independiente: ambas consultan y procesan resultados. Minimizar no escribe ni retira trabajos; nuevas actualizaciones no expanden.

Las incidencias tienen señal visible en compacto y acceso al detalle. Las reglas actuales de retiro y reintento permanecen separadas de esa presentación.

## Cuenta y recuperación

Los trabajos visibles deben pertenecer a la cuenta autenticada. Una preferencia visual solo vive en la sesión actual y se reinicia al cambiar de cuenta. Si se necesita adaptar el almacenamiento local, usar ámbito por usuario autenticado, conservar la clave legada sin exponer nombres no verificados y recuperar pendientes autorizados del servidor. Guardar un nombre local no acredita autorización. Las respuestas tardías no se aplican a una nueva sesión.

## Borrador de evaluación

Se conserva preparación → generación → revisión. La señal contextual de éxito no inicia generación adicional ni cambia preguntas, criterios o persistencia.
