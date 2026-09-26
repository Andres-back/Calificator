# Especificación: Optimizar fluidez y organización del frontend

**Rama**: `codex/074-optimizar-frontend`

**Creada**: 2026-09-26

**Estado**: Aprobado

**Issue**: [#155](https://github.com/Andres-back/Calificator/issues/155)

## Escenarios de usuario y pruebas

### Historia 1 - Buscar calificaciones sin bloqueos (Prioridad: P1)

Como docente, quiero buscar estudiantes y calificaciones desde celular o escritorio sin que cada letra congele la vista ni dispare una consulta inmediata.

**Razón de prioridad**: Este flujo se utiliza dentro del aula y la demora al escribir impide localizar rápidamente a un estudiante.

**Prueba independiente**: Al escribir rápidamente un nombre, la interfaz conserva el texto local y consulta una sola vez después de una pausa breve; el resultado anterior permanece visible mientras llega la nueva página.

**Aceptación**:

1. **Dado** el listado de calificaciones, **cuando** el docente escribe varias letras de forma continua, **entonces** no se envía una solicitud por cada pulsación.
2. **Dado** un resultado visible, **cuando** comienza una nueva búsqueda, **entonces** la vista no desaparece ni bloquea el desplazamiento mientras carga.
3. **Dado** un teléfono de 360 px, **cuando** el docente busca y abre un estudiante, **entonces** puede completar el recorrido con controles táctiles accesibles y sin desbordamiento horizontal.

### Historia 2 - Navegar con menos esperas y consumo innecesario (Prioridad: P1)

Como usuario, quiero que las vistas estables dejen de consultar continuamente y que las pantallas públicas descarguen solo los recursos necesarios para mi dispositivo.

**Razón de prioridad**: Los docentes y estudiantes pueden usar celulares de gama baja o redes limitadas; consultas e imágenes innecesarias perjudican la demostración y el uso real.

**Prueba independiente**: Una vista estudiantil estable no realiza consultas periódicas; una operación en proceso sí actualiza su estado; la pantalla pública móvil no descarga ilustraciones ocultas de escritorio ni funciones internas exclusivas del área autenticada.

**Aceptación**:

1. **Dada** una entrega o evaluación en estado estable, **cuando** el usuario permanece en la vista, **entonces** no se repite una consulta cada diez segundos.
2. **Dado** un proceso activo que requiere seguimiento, **cuando** cambia su estado, **entonces** la interfaz sigue actualizándolo hasta éxito o error visible.
3. **Dada** la landing o el acceso desde celular, **cuando** carga la página, **entonces** no se descargan imágenes decorativas ocultas de escritorio ni módulos exclusivos del área autenticada.

### Historia 3 - Encontrar acciones sin redundancia en móvil (Prioridad: P2)

Como profesor, estudiante o administrador, quiero ver primero las acciones relevantes y navegar dentro de una materia sin recorrer tarjetas repetidas o pestañas difíciles de descubrir.

**Razón de prioridad**: La repetición y el apilamiento hacen más largo el recorrido para docentes de 30 a 60 años, aunque las funciones existan.

**Prueba independiente**: Los tableros mantienen todas sus acciones con una jerarquía más compacta; la navegación interna de materia identifica la sección actual y permite abrir las demás a 360 px.

**Aceptación**:

1. **Dado** el inicio docente, **cuando** no hay pendientes ni reclamos, **entonces** se muestra un único estado vacío compacto y no dos paneles grandes sin contenido.
2. **Dado** el inicio de cualquier rol, **cuando** se muestran acciones rápidas, **entonces** una misma acción no aparece dos veces con igual jerarquía en el mismo primer recorrido.
3. **Dada** una materia en móvil, **cuando** el usuario cambia de sección, **entonces** puede identificar y alcanzar todas las secciones sin adivinar que existe desplazamiento horizontal.
4. **Dada** la landing móvil, **cuando** un usuario ya registrado quiere entrar, **entonces** el acceso “Ingresar” es visible sin desplazarse al pie de página.
5. **Dado** el formulario de acceso, **cuando** el usuario olvida la contraseña, **entonces** se presenta una sola acción inequívoca de recuperación.

### Casos límite

- Una búsqueda vacía o limpiada debe volver al listado inicial sin conservar una consulta obsoleta.
- Si una consulta de búsqueda falla, el resultado anterior no debe presentarse como resultado actualizado y debe existir un error recuperable.
- Si el documento vuelve a primer plano después de quedar oculto, los datos permitidos deben poder refrescarse sin reiniciar el flujo.
- Las operaciones realmente asíncronas conservan seguimiento, reintento y estados visibles; la optimización no puede silenciar procesos activos.
- Las imágenes mantienen texto alternativo y una variante legible en modo claro y oscuro.
- La reorganización no elimina rutas, permisos ni acciones; solo cambia carga, jerarquía o presentación.

## Requisitos

### Requisitos funcionales

- **FR-001**: El buscador de calificaciones DEBE separar el valor escrito del valor consultado y aplicar una espera breve antes de solicitar resultados.
- **FR-002**: El cambio de búsqueda DEBE preservar una transición visual estable y cancelar o ignorar respuestas obsoletas.
- **FR-003**: Las vistas con información estable NO DEBEN consultar periódicamente por defecto; el seguimiento periódico DEBE limitarse a estados en proceso.
- **FR-004**: La landing y el acceso DEBEN servir imágenes responsivas y evitar descargar recursos decorativos no visibles en el dispositivo.
- **FR-005**: La entrada pública NO DEBE precargar funciones internas de gráficas o formato enriquecido que solo utiliza el área autenticada.
- **FR-006**: Los recursos visuales optimizados DEBEN conservar apariencia, texto alternativo y nitidez suficiente para su tamaño real de presentación.
- **FR-007**: La landing móvil DEBE mostrar las acciones “Ingresar” y “Crear cuenta” en el primer recorrido visible.
- **FR-008**: El acceso DEBE mostrar una única acción de recuperación de contraseña.
- **FR-009**: La navegación interna de materia DEBE mostrar claramente la sección activa y ofrecer acceso descubrible a todas las secciones a partir de 360 px.
- **FR-010**: Los tableros por rol DEBEN reducir acciones duplicadas y compactar estados vacíos sin retirar capacidades ni cambiar permisos.
- **FR-011**: Toda operación asíncrona existente DEBE conservar un estado visible de carga, éxito o error y su mecanismo de recuperación.
- **FR-012**: Los cambios NO DEBEN modificar interfaces públicas, registros guardados, reglas de autorización ni el cálculo o publicación de calificaciones.
- **FR-013**: La solución DEBE funcionar entre 360 px y 1920 px, con teclado, tacto, modo claro y modo oscuro, sin desbordamiento horizontal.
- **FR-014**: El ruido de analítica bloqueada DEBE tratarse sin debilitar la política de seguridad; scripts no autorizados no deben habilitarse con directivas permisivas globales.

### Entidades clave

- **Consulta de calificaciones**: filtros locales y valor estable que determina la consulta remota, sin persistencia nueva.
- **Estado de proceso**: condición estable o transitoria que decide si una vista necesita seguimiento periódico.
- **Recurso visual responsivo**: variantes de una imagen de marca seleccionadas según tamaño y capacidad del dispositivo.
- **Acción de navegación**: destino existente organizado por rol y contexto; conserva la autorización actual.

## Criterios de éxito

- **SC-001**: Una secuencia de escritura rápida produce como máximo una consulta de búsqueda después de la pausa configurada.
- **SC-002**: Las vistas estudiantiles estables auditadas realizan cero consultas periódicas durante treinta segundos sin interacción.
- **SC-003**: La pantalla pública móvil no solicita imágenes marcadas como exclusivas de escritorio.
- **SC-004**: La transferencia inicial pública se reduce al menos 40 % frente a la medición base aproximada de 3,67 MB, sin contar scripts de terceros inyectados por infraestructura.
- **SC-005**: Los recorridos responsive, accesibilidad y regresión visual aplicables permanecen verdes en 360×800, 390×844, 768×1024, 1366×768 y 1920×1080.
- **SC-006**: Cada acción existente en los tableros y la navegación de materia conserva un destino funcional y autorizado.
- **SC-007**: TypeScript, lint, pruebas frontend y E2E relevantes permanecen verdes.

## Supuestos

- Las interfaces y los datos actuales son suficientes; esta mejora se limita a la experiencia de uso y la entrega de recursos visuales.
- Las consultas se actualizan al navegar, mutar datos o recuperar el foco; solo los procesos activos requieren polling.
- Las imágenes originales se conservan cuando sean necesarias como fuente, pero las vistas utilizan variantes optimizadas.
- El bloqueo de Cloudflare Insights por extensiones del navegador no es un fallo funcional; la política CSP no se relajará para ocultarlo.
- La descomposición profunda de componentes monolíticos se realizará en cambios posteriores si no es necesaria para cumplir estos criterios sin riesgo.
