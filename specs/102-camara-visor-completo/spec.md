# Especificación: cámara real y evaluación completa

**Rama**: `codex/102-camara-visor-completo` | **Creada**: 2026-10-17 | **Estado**: Aprobada el 2026-10-17 | **Issue**: [#212](https://github.com/Andres-back/Calificator/issues/212)

## Escenarios de usuario y pruebas

### Historia 1 - Tomar una foto sin confundirla con subir archivos (Prioridad: P1)

Como docente, quiero que «Tomar foto» me muestre la cámara y permita revisar la foto antes de añadirla a la entrega. Si no puedo usarla, quiero subir una foto o PDF sin perder lo preparado.

**Razón de prioridad**: el control actual promete una cámara pero puede abrir solamente un selector de archivos.

**Prueba independiente**: preparar una entrega sintética, tomar una foto, repetirla y aceptarla; comprobar que se incorpora una sola hoja y que no se envía a calificar hasta solicitarlo.

**Aceptación**:
1. **Dado** un estudiante seleccionado y espacio para otra hoja, **cuando** el docente pulsa «Tomar foto» y concede permiso, **entonces** ve la cámara, captura y puede aceptar o repetir antes de añadir la hoja.
2. **Dado** que se deniega el permiso o no hay cámara utilizable, **cuando** termina el intento, **entonces** aparece una explicación sencilla con «Subir fotos o PDF», sin borrar hojas ni enviar nada.
3. **Dado** un paquete con varias hojas, **cuando** se repite una foto concreta y se acepta, **entonces** solo esa hoja se reemplaza, conservando el orden y las demás hojas.
4. **Dado** un intento de captura abierto, **cuando** se cancela, cambia el estudiante, comienza un envío, se abandona la vista o pasa a segundo plano, **entonces** se apaga la cámara y no se incorpora una captura tardía al nuevo contexto.

### Historia 2 - Leer la evaluación completa sin una ventana estrecha (Prioridad: P1)

Como docente, quiero ver el formato final con espacio para leer, recorrer todas las páginas deslizando y encontrar descargas sin que sus controles tapen la evaluación.

**Razón de prioridad**: la vista actual combina barras, pie fijo y desplazamientos que reducen el espacio de lectura, especialmente en celular.

**Prueba independiente**: abrir una evaluación sintética de varias páginas en celular y escritorio, recorrerla hasta la última página y regresar; abrir la versión completa y descargarla.

**Aceptación**:
1. **Dado** un documento de varias páginas, **cuando** se abre «Visualizar evaluación», **entonces** todas sus páginas son alcanzables con un solo desplazamiento vertical de lectura, empezando por la primera.
2. **Dado** un celular, **cuando** se visualiza a tamaño normal, **entonces** el documento aprovecha el ancho y el alto disponibles, sin desplazamiento horizontal de la pantalla ni pie permanente de descargas.
3. **Dado** el visor, **cuando** se abre «Opciones», **entonces** se encuentran PDF, Word editable y «Ver evaluación completa», identificando que esta última acción abre otra pestaña.
4. **Dado** un docente autorizado, **cuando** elige solucionario, **entonces** puede consultar y descargar esa versión; un estudiante nunca obtiene controles ni documentos de soluciones.

### Casos límite

- Cámara inexistente, ocupada, permiso denegado o conexión que no permite capturar: explicación y subida de archivos; no prometer que todos los navegadores abrirán la cámara nativa.
- Permiso pendiente al cancelar: cualquier acceso que termine después se descarta y la cámara se apaga.
- Contexto de entrega cambiado con captura pendiente: cancelar la captura sin borrar hojas ni asignarla al nuevo estudiante/evaluación.
- PDF ya seleccionado, diez fotos, límites de tamaño o envío en curso: conservar restricciones existentes, incluida la prohibición de mezclar PDF y fotos.
- Foto oscura o borrosa: conservar el análisis existente, advertencias y repetición; no saltar comprobaciones por proceder de la cámara.
- Cierre del visor, cambio de evaluación o versión durante una descarga: cancelar solicitudes y liberar recursos; nunca mostrar una versión anterior como si fuera la actual.
- Documento de veinte páginas: todas deben ser accesibles, sin dibujarlas simultáneamente en alta resolución.
- Documento inválido, fallo de lectura o de Word: mensaje recuperable; las alternativas autorizadas disponibles permanecen accesibles.
- Rotación del dispositivo, teclado, áreas seguras y tema oscuro: mantener controles y documento utilizables.

## Requisitos

### Requisitos funcionales

- **FR-001**: «Tomar foto» DEBE iniciar una cámara visible tras una acción y permiso explícitos; «Subir fotos o PDF» DEBE seguir siendo una acción separada y comprensible.
- **FR-002**: La captura DEBE permitir revisar, repetir, aceptar o cancelar; aceptar añade exactamente una hoja, sin envío automático ni cambio de estudiante.
- **FR-003**: El sistema DEBE ofrecer recuperación mediante archivos cuando la cámara no esté disponible o el permiso falle, conservando la entrega preparada.
- **FR-004**: La cámara DEBE apagarse al cancelar, salir, ocultarse la aplicación, cambiar de contexto o iniciar un envío; las operaciones tardías no DEBEN modificar otro contexto.
- **FR-005**: Capturas y archivos DEBEN mantener análisis de calidad, orden, sustitución específica y límites existentes: diez fotos, 10 MB por foto y 40 MB por paquete, o un único PDF.
- **FR-006**: El visor DEBE mostrar todas las páginas por desplazamiento vertical continuo, con carga progresiva y estados de espera/error recuperables.
- **FR-007**: El visor DEBE aprovechar la pantalla, mantener lectura a ancho normal sin desbordamiento horizontal y agrupar descargas/abrir documento bajo «Opciones», sin un pie fijo que ocupe la lectura.
- **FR-008**: «Ver evaluación completa» DEBE abrir el documento autorizado en otra pestaña, indicándolo; PDF y Word editable DEBEN conservar la versión seleccionada y advertir que editar Word no actualiza el sistema.
- **FR-009**: El solucionario DEBE seguir restringido a docentes autorizados, partir de «Sin respuestas» y no filtrarse por cambios de evaluación, errores o reintentos.
- **FR-010**: Los controles DEBEN ser accesibles por teclado, tener objetivos táctiles mínimos de 44 × 44 px y funcionar desde 360 px hasta escritorio, en temas claro y oscuro, con foco y cierre recuperables.
- **FR-011**: El cambio NO DEBE modificar notas, evidencias persistidas, evaluación guardada, modelos, proveedores, claves ni permisos; capturar una foto no equivale a enviarla a calificar.

### Entidades clave

- **Captura provisional**: foto local ligada a la entrega actual; se descarta al cancelar y pasa a hoja preparada únicamente tras aceptar.
- **Documento visualizado**: versión autorizada de una evaluación, compuesta por páginas; su vida termina al cerrar o cambiar de evaluación/versión.

## Criterios de éxito

- **SC-001**: En pruebas de cámara disponible, denegada, inexistente y cancelación tardía, el 100 % de las acciones terminan con una foto revisable o una alternativa clara, sin envíos automáticos ni pérdida de hojas.
- **SC-002**: Una evaluación sintética de veinte páginas permite llegar de la primera a la última y volver sin omitir páginas ni necesitar abrir PDF fuera de la aplicación.
- **SC-003**: A 360, 390 y 1440 px, los controles esenciales permanecen visibles y accionables sin desplazamiento horizontal de la pantalla; el área de lectura ocupa al menos el 60 % del alto del visor en vista normal a 390 × 844 px, con «Opciones» cerrado.
- **SC-004**: Las regresiones de acceso, sustitución de fotos, calidad, orden, descargas y cambios de versión conservan su comportamiento; no se escriben datos académicos durante las pruebas.

## Supuestos

- Evoluciona los dominios propietarios 005 (evaluaciones) y 008 (calificación); no reemplaza sus reglas.
- Se reutilizan los documentos y permisos actuales. El selector de evidencias también tiene un consumidor estudiante que debe conservar su flujo y restricciones.
- La cámara depende de permisos y capacidades del navegador; no se requiere instalar una aplicación nativa ni activar servicios de pago.
- La validación automatizada cubrirá Chromium y WebKit emulados; no se presentará como una prueba de dispositivos físicos iPhone/Android.
- Fuera de alcance: extracción/recreación de figuras y tablas (Spec 101), corrección de respuestas, nuevas llamadas a IA, cambios de calificación o despliegue manual del servidor.
- El usuario autorizó el alcance y solicitó PR/fusión cuando esté listo. La revisión del plan documental y de la lista de requisitos se registra antes de implementar, conforme a la constitución.
