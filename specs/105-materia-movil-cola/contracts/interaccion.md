# Contrato de interacción

## Operaciones conservadas

Crear materia mantiene cuerpo, validaciones y destino actuales. Subir evidencia conserva aceptación 202 y registro de trabajo. Consultar trabajos, recuperar pendientes y reintentar mantienen contratos, permisos e intervalos actuales. Este cambio no añade endpoints ni cambia modelos de IA.

## Acciones de presentación

| Acción | Efecto permitido | Efecto prohibido |
| --- | --- | --- |
| Más opciones / plegar | Mostrar ayuda y descripción, conservar valores | Alta, borrado o cambio de valores |
| Listo | Terminar escritura, conservar formulario | Enviar o cerrar como éxito |
| Ver progreso / Minimizar | Cambiar tamaño del seguimiento | Cancelar, borrar, reenviar, reintentar o detener consultas |
| Nuevo estado o trabajo | Actualizar indicador y señal de atención | Expandir o tomar foco automáticamente |
| Cambiar de cuenta | Reiniciar presentación y recuperar trabajos autorizados | Mostrar nombres de la sesión anterior |

## Accesibilidad y fallos

Campos móviles de al menos 16 px; acciones de al menos 44 px en ambos ejes. Las mediciones DOM pueden tolerar únicamente redondeo subpíxel de 0,001 px, no controles realmente inferiores. Sin scroll horizontal de página, foco perdido ni controles cubiertos por teclado/monitor. Incidencias distinguibles sin depender solo del color.

Una subida fallida conserva foto y contexto según comportamiento existente. No afirmar guardado antes de aceptación ni mostrar cero como nota pendiente. El éxito contextual de borrador no reemplaza errores o advertencias.

Los datos de pruebas son sintéticos. Ninguna operación visual modifica notas, evidencias o publicación.
