# Contrato de comportamiento del frontend

## Búsqueda de calificaciones

1. El campo responde inmediatamente a escritura y limpieza.
2. La consulta remota recibe el texto estable después de 300 ms.
3. Una ráfaga continua produce una sola consulta final.
4. La lista previa permanece montada durante la transición.
5. Cualquier respuesta asociada a una clave anterior no reemplaza la clave vigente.

## Actualización remota

1. Evaluaciones, boletines y contexto estudiantil estables no consultan por intervalo.
2. Recuperar el foco puede refrescar una vista configurada para ello.
3. Las mutaciones invalidan las claves ya existentes.
4. Los estados transitorios conservan seguimiento hasta estado terminal.

## Entrada pública

1. “Ingresar” y “Crear cuenta” son visibles desde 360 px.
2. El acceso presenta una sola acción “¿Olvidaste tu contraseña?”.
3. Una imagen oculta por breakpoint no se solicita en ese breakpoint.
4. Gráficas, Markdown y exportación no aparecen como `modulepreload` de `index.html`.

## Navegación de materia

1. En móvil existe un control etiquetado “Sección de la materia”.
2. Su valor coincide con la ruta activa.
3. Sus opciones corresponden exactamente a las pestañas permitidas por permisos.
4. Cambiar una opción navega al mismo destino usado en escritorio.
5. Desde `md` se conserva la navegación visual por pestañas.

## Tableros

1. Todas las acciones previas conservan al menos un acceso funcional.
2. La bandeja vacía docente ocupa un único bloque compacto.
3. Si hay reclamos o pendientes, las listas detalladas siguen disponibles.
4. Una acción primaria no se repite con la misma jerarquía en el mismo recorrido.
