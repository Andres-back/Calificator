# Accesibilidad y usabilidad en XCalificator

Guía del principio V de la [constitución](../.specify/memory/constitution.md). Se aplica a toda pantalla que usen docentes o estudiantes; las de administración la siguen en lo posible.

**Estándar de referencia:** [WCAG 2.2](https://www.w3.org/TR/WCAG22/), nivel AA. A eso se suman criterios propios para docentes mayores que usan la plataforma desde el celular, más exigentes que el mínimo de WCAG en tamaño táctil y lenguaje.

Cada criterio dice cómo se verifica:

- **Auto**: prueba automática que corre en CI. Pruebas de interfaz (`vitest`) o recorridos en navegador (`playwright`, carpeta `frontend/e2e/accessibility`), con revisión automática de reglas WCAG (axe) en las pantallas principales.
- **Recorrido**: comprobación manual al cerrar una spec que cambie la interfaz.

## 1. Perceptible

| Criterio | WCAG | Verificación |
| --- | --- | --- |
| Contraste de texto de al menos 4,5:1; 3:1 en texto grande, íconos con significado, bordes de campos y foco. En modo claro y oscuro. | 1.4.3, 1.4.11 | Auto (axe) |
| La información no depende solo del color: los estados (correcta, por revisar, error) llevan texto o ícono. | 1.4.1 | Recorrido |
| Texto base de 16 px; nada esencial por debajo de 12 px. | Propio | Recorrido |
| Imágenes con significado tienen texto alternativo; las decorativas se ocultan al lector de pantalla. | 1.1.1 | Auto (axe) |
| Sin desplazamiento horizontal desde 320 px de ancho y con zoom al 200 %. | 1.4.10, 1.4.4 | Auto |

## 2. Operable

| Criterio | WCAG | Verificación |
| --- | --- | --- |
| Todo se puede usar con teclado, con orden lógico y foco siempre visible. | 2.1.1, 2.4.3, 2.4.7 | Auto (pantallas principales) y recorrido |
| Objetivos táctiles de al menos **44 × 44 px** (WCAG pide 24; usamos 44 por los docentes mayores). | 2.5.8 + propio | Auto |
| Los diálogos atrapan el foco, se cierran con Escape y devuelven el foco al botón que los abrió. | 2.4.3 | Auto |
| Sin límites de tiempo para el docente; las sesiones avisan antes de vencer. | 2.2.1 | Recorrido |
| El movimiento se puede pausar y respeta «reducir movimiento» del sistema. | 2.2.2, 2.3.3 | Auto (donde hay animación) |
| Cada página tiene título y un único encabezado principal; las secciones usan encabezados y regiones. | 2.4.2, 2.4.6, 1.3.1 | Auto (axe) |

## 3. Comprensible

| Criterio | WCAG | Verificación |
| --- | --- | --- |
| Lenguaje llano, sin tecnicismos ni nombres internos («desglose», «pipeline», códigos de estado). | 3.1.5 (AAA, adoptado) | Recorrido |
| Cada campo tiene etiqueta visible; la ayuda y el error quedan asociados al campo. | 3.3.2, 1.3.1 | Auto |
| Los errores dicen qué pasó y cómo resolverlo, junto al campo o en una alerta. | 3.3.1, 3.3.3 | Recorrido |
| Las acciones irreversibles (publicar, borrar, confirmar nota) piden confirmación. | 3.3.4 | Auto (flujos críticos) |
| La misma acción se llama igual en todas las pantallas. | 3.2.4 | Recorrido |

## 4. Robusto

| Criterio | WCAG | Verificación |
| --- | --- | --- |
| Todo control tiene nombre accesible; los roles y atributos ARIA son válidos. | 4.1.2 | Auto (axe) |
| Los cambios de estado (cargando, guardado, error) se anuncian (`role="status"` o `role="alert"`). | 4.1.3 | Auto |

## 5. Usabilidad para docentes mayores

Criterios propios. Se comprueban en el recorrido de cada spec de interfaz, en celular (360–390 px) y en computador (1366 px).

1. **Una acción principal por pantalla**, visible sin abrir menús.
2. **Los avisos explican la causa y el siguiente paso**, con un botón que lleva a ese paso. Ejemplo: «Las respuestas de las preguntas 2 y 3 no aparecen en las fotos» → «Añadir la foto que falta».
3. **Nada se pierde por un error del docente**: confirmación antes de lo irreversible, borradores conservados y opción de volver sin cambios.
4. **La IA propone y el docente decide**, y la pantalla deja ver por qué la IA sugiere algo: qué leyó, qué comparó y qué falta.
5. **Las tareas largas muestran progreso** y terminan en un estado visible: éxito, espera o error (principio V).

## Cómo se mide la usabilidad

- **En el piloto:** encuesta final basada en el modelo de aceptación tecnológica (Davis, 1989), con las dimensiones de utilidad percibida y facilidad de uso (Anexo G de la tesis). Para pilotos futuros se recomienda añadir la escala SUS (System Usability Scale) y observar tareas con tiempo y errores.
- **En el desarrollo:** el recorrido de cada spec de interfaz y las capturas en celular y computador.

## Lo que todavía no se cubre

- Prueba con lector de pantalla (NVDA en computador, TalkBack en Android) de los flujos críticos: pendiente, se hace manualmente al menos una vez por entrega mayor.
- Revisión automática de las pantallas que no tienen recorrido de accesibilidad propio.
