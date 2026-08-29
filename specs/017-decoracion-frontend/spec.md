# Especificación de funcionalidad: Decoración visual transversal

**Rama**: `codex/017-decoracion-frontend`

**Issue**: [#22](https://github.com/Andres-back/Calificator/issues/22)

**Creado**: 2026-08-21

**Estado**: Aprobado

**Entrada**: “Sin dañar funcionalidad y usando tu capacidad para generar imágenes y elementos decora el frontend”.

## Escenarios de usuario y pruebas

### Historia 1 - Orientación visual consistente (Prioridad: P1)

Como profesor o estudiante quiero reconocer inmediatamente dónde estoy y qué acción es principal, dentro de una experiencia visual atractiva que conserve los flujos que ya conozco.

**Por qué es prioritaria**: La decoración solo aporta valor si facilita la orientación y no compite con las tareas educativas.

**Prueba independiente**: Recorrer inicio, materias, evaluaciones, recursos, calificaciones y Xali con ambos roles, comprobando que títulos, acciones y contenido mantienen su orden y comportamiento.

**Escenarios de aceptación**:

1. **Dado** un usuario autenticado, **cuando** navega entre páginas de su rol, **entonces** percibe una ambientación coherente sin cambios en rutas, permisos ni acciones.
2. **Dado** un formulario o actividad existente, **cuando** el usuario interactúa con sus controles, **entonces** la decoración no los cubre, desplaza ni deshabilita.
3. **Dado** un estado vacío, de carga o de error, **cuando** aparece, **entonces** conserva un mensaje legible y una acción comprensible.

---

### Historia 2 - Experiencia inclusiva en cualquier pantalla (Prioridad: P2)

Como usuario en celular, tableta o escritorio quiero que los recursos decorativos se adapten al espacio disponible y mantengan una lectura cómoda en modo claro y oscuro.

**Por qué es prioritaria**: Gran parte del uso ocurre en celulares y la apariencia no puede introducir recortes, ruido ni sobrecarga.

**Prueba independiente**: Revisar las páginas representativas a 360×800, 390×844, 768×1024, 1366×768 y 1920×1080 en ambos temas.

**Escenarios de aceptación**:

1. **Dado** un ancho de 360 px, **cuando** se muestra cualquier recurso decorativo, **entonces** no existe desplazamiento horizontal ni controles inaccesibles.
2. **Dado** el modo oscuro, **cuando** se presenta texto sobre una superficie decorada, **entonces** conserva contraste suficiente y la ilustración permanece secundaria.
3. **Dado** que el usuario prefiere movimiento reducido, **cuando** abre o navega por la aplicación, **entonces** no recibe animaciones decorativas persistentes.

---

### Historia 3 - Identidad visual propia y ligera (Prioridad: P3)

Como miembro de la comunidad educativa quiero una interfaz reconocible como XCalificator, con ilustraciones originales y la mascota actual, sin aumentar de forma perceptible el tiempo de carga.

**Por qué es prioritaria**: Refuerza la confianza y la personalidad del producto sin sacrificar rendimiento.

**Prueba independiente**: Cargar la aplicación con caché vacía y confirmar que la imagen decorativa no contiene texto, marcas externas ni elementos que parezcan controles.

**Escenarios de aceptación**:

1. **Dado** el recurso ilustrado de marca, **cuando** se muestra detrás del contenido, **entonces** no contiene texto, logotipos externos ni información educativa susceptible de ser incorrecta.
2. **Dado** una conexión lenta, **cuando** el recurso aún no carga, **entonces** la página sigue siendo comprensible y completamente utilizable.

### Casos límite

- La imagen decorativa no carga o es bloqueada por el navegador.
- El texto del usuario aumenta a 200 %.
- La página contiene tablas, modales o visores de evidencia con gran altura.
- El usuario alterna entre modo claro y oscuro durante la navegación.
- El navegador solicita reducir movimiento o contraste adicional.

## Requisitos

### Requisitos funcionales

- **FR-001**: La mejora DEBE preservar todas las rutas, permisos, formularios, contratos y acciones existentes.
- **FR-002**: La aplicación DEBE utilizar una ambientación visual coherente con la identidad actual de XCalificator y su mascota.
- **FR-003**: Los recursos decorativos DEBEN permanecer fuera del árbol de interacción y no anunciarse como contenido a tecnologías de asistencia.
- **FR-004**: La decoración DEBE adaptarse a profesor y estudiante sin introducir capacidades cruzadas entre roles.
- **FR-005**: La experiencia DEBE conservar legibilidad y contraste en modo claro y oscuro.
- **FR-006**: La experiencia DEBE funcionar desde 360 px hasta escritorio sin desbordamiento horizontal causado por la decoración.
- **FR-007**: Las ilustraciones nuevas DEBEN ser originales, no contener texto ni marcas externas y funcionar como ambientación secundaria.
- **FR-008**: La aplicación DEBE seguir siendo completamente utilizable si una imagen decorativa no se carga.
- **FR-009**: La decoración DEBE respetar la preferencia de movimiento reducido.
- **FR-010**: Los recorridos críticos de ambos roles DEBEN conservar resultados visibles de carga, éxito, espera y error.
- **FR-011**: Todo control presentado visual y semánticamente como botón DEBE ejecutar una acción verificable, enviar un formulario o abrir una navegación válida.
- **FR-012**: Un elemento únicamente explicativo NO DEBE presentarse como botón; cuando la explicación corresponda a un flujo complejo, DEBE ofrecerse mediante una guía contextual.
- **FR-013**: Las guías contextuales de los flujos complejos DEBEN abrirse automáticamente en la primera visita de cada rol y versión, poder omitirse y volver a abrirse manualmente.
- **FR-014**: La aplicación DEBE conservar un registro local por rol, guía y versión para no repetir automáticamente una guía ya completada.
- **FR-015**: El cuento DEBE diferenciar visualmente portada, personajes, narración, moraleja y preguntas, conservando lectura cómoda desde 360 píxeles y un reemplazo legible cuando falte la ilustración.
- **FR-016**: El visor de presentaciones DEBE priorizar la diapositiva activa, indicar posición, ofrecer controles táctiles claros y mantener miniaturas navegables sin bloquear el desplazamiento.

## Criterios de éxito

### Resultados medibles

- **SC-001**: El 100 % de los recorridos críticos revisados conserva el mismo destino y resultado funcional anterior al cambio.
- **SC-002**: No se detecta desplazamiento horizontal ni contenido cortado en las cinco resoluciones objetivo.
- **SC-003**: El 100 % de los textos y controles principales continúa siendo legible en modo claro y oscuro.
- **SC-004**: La interfaz sigue siendo utilizable cuando se bloquean las imágenes decorativas.
- **SC-005**: Todas las verificaciones automáticas de tipos, estilo, pruebas y construcción aplicables permanecen verdes.
- **SC-006**: La nueva imagen carece de texto, marcas externas y elementos que puedan confundirse con controles interactivos.
- **SC-007**: El 100 % de los botones inventariados tiene una acción, envío o navegación válida, y la auditoría automatizada no reporta controles sin propósito.
- **SC-008**: Cada guía existente de calificaciones se abre una sola vez en la primera visita por rol y versión, permanece omitible y puede abrirse manualmente después.
- **SC-009**: Un estudiante distingue las cinco partes del cuento en menos de 20 segundos y puede leerlo sin desplazamiento horizontal en 360, 390, 768 y 1366 píxeles.
- **SC-010**: El visor permite identificar la diapositiva activa y avanzar o retroceder con objetivos táctiles visibles en móvil y escritorio.

## Supuestos

- La identidad, logotipo y mascota actuales se mantienen; no se rediseña la marca.
- El alcance es exclusivamente visual y no incorpora nuevas capacidades de negocio.
- Se priorizan superficies compartidas y páginas de entrada para obtener consistencia sin modificar cada flujo individual.
- Los recursos existentes que ya cumplen su función permanecen disponibles.
- La solicitud del usuario autoriza el alcance conservador descrito y su implementación sin cambios funcionales.

## Evolución: iconografía personalizada — Issue #43

- **FR-017**: La aplicación DEBE disponer de una familia original y coherente de iconos ilustrados para Materias, Recursos, Calificar y Presentaciones, sin texto ni marcas externas.
- **FR-018**: Los iconos ilustrados DEBEN utilizarse únicamente en tarjetas y estados destacados donde conserven un tamaño legible; la navegación, los botones y los controles pequeños DEBEN mantener símbolos vectoriales accesibles y una etiqueta comprensible.
- **FR-019**: Cada icono ilustrado DEBE contar con un reemplazo comprensible si el recurso gráfico no carga.

### Criterio adicional de éxito

- **SC-011**: Los cuatro iconos se distinguen a 48 píxeles, conservan transparencia y contraste en ambos temas y su ausencia no impide reconocer ni utilizar la acción asociada.

### Supuesto adicional

La evolución amplía esta especificación viva sin rediseñar el logotipo ni la mascota y conserva intactos rutas, permisos y contratos.

## Evolución: iconografía semántica de navegación y recursos — Issue #45

### Escenarios de aceptación

1. Un profesor reconoce Inicio, Materias, Recursos, Presentaciones, Reportes, Xali y Configuración IA por una silueta propia, manteniendo siempre visible su etiqueta textual.
2. Al elegir un formato, el profesor distingue visualmente crucigrama, sopa de letras, relacionar pares, guía, taller, cuento, para colorear, plan de refuerzo, lectura comprensiva, mapa conceptual y flashcards.
3. El mismo símbolo acompaña un tipo de recurso en el selector, el listado general, la materia y las vistas de docente y estudiante.
4. Los materiales históricos equivalentes usan el símbolo de su formato canónico sin volver a ofrecerse como opciones duplicadas de creación.

### Requisitos adicionales

- **FR-020**: Cada destino visible de la navegación principal docente DEBE tener un símbolo semántico propio, legible en estado normal y activo, acompañado por su etiqueta textual.
- **FR-021**: Cada formato canónico disponible para crear recursos DEBE tener un símbolo inequívoco y conservarlo en todas las superficies donde se muestra ese recurso.
- **FR-022**: Los tipos históricos equivalentes DEBEN compartir la identidad visual del tipo canónico correspondiente y NO DEBEN reaparecer como alternativas de creación independientes.
- **FR-023**: La renovación visual NO DEBE modificar destinos, permisos, nombres accesibles, acciones ni comportamiento de creación, asignación o resolución.
- **FR-024**: La iconografía semántica DEBE usar las miniilustraciones de la lámina aprobada, con transparencia, alto contraste y tamaño visible; no puede sustituirse por un trazo monocromo simplificado.
- **FR-025**: Cada activo ilustrado DEBE conservar un fallback SVG local sin alterar etiquetas, destinos, acciones ni nombres accesibles.

### Criterios adicionales de éxito

- **SC-012**: El 100 % de los destinos docentes y formatos canónicos visibles presenta un símbolo reconocible sin depender únicamente del color.
- **SC-013**: En una pantalla de 390 píxeles no existe desbordamiento horizontal y todas las tarjetas y enlaces conservan nombre accesible y objetivo táctil utilizable.
- **SC-014**: Los 18 WebP aprobados cargan desde producción y los once formatos canónicos mantienen la misma ilustración en selector, listado, materia y detalle.

### Alcance aclarado

“Laderboard” se interpreta como la barra lateral mostrada por el usuario. No se crea un ranking nuevo porque el producto no dispone actualmente de ese recorrido.
