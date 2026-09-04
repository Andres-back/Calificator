# Especificación: Identidad web, favicon y SEO técnico

**Rama**: codex/030-identidad-seo | **Creada**: 2026-08-31 | **Estado**: Especificación aprobada | **Issue**: #63

## Escenarios de usuario y pruebas

### Historia 1 - Reconocer XCalificator en navegador y dispositivo (Prioridad: P1)

Como visitante quiero reconocer XCalificator por su nombre e identidad visual en la pestaña, favoritos y accesos del dispositivo para distinguirlo de otros sitios y regresar con confianza.

**Razón de prioridad**: La identidad actual usa un favicon genérico que no corresponde con la marca aprobada y pierde reconocimiento en los puntos de entrada más frecuentes.

**Prueba independiente**: Abrir la portada, guardarla como favorito y añadirla a la pantalla de inicio en un navegador compatible; todos los contextos muestran el nombre y un icono XCalificator legible, sin deformación ni recursos ausentes.

**Aceptación**:
1. **Dado** un navegador de escritorio o celular, **cuando** se abre XCalificator, **entonces** la pestaña muestra un favicon reconocible y coherente con la marca.
2. **Dado** un dispositivo compatible, **cuando** se guarda un favorito o acceso, **entonces** aparecen el nombre corto, los colores y el icono de XCalificator.
3. **Dado** modo claro u oscuro, **cuando** cambia la apariencia del sistema, **entonces** el navegador conserva contraste adecuado en su interfaz sin alterar la legibilidad del sitio.

### Historia 2 - Encontrar y comprender la portada pública (Prioridad: P1)

Como docente o estudiante que descubre el proyecto quiero entender desde un resultado de búsqueda qué es XCalificator y para quién sirve antes de abrirlo.

**Razón de prioridad**: La portada es la única superficie pública que debe atraer participantes; actualmente carece de descripción, dirección canónica y reglas explícitas de indexación.

**Prueba independiente**: Consultar la portada como rastreador y comprobar que expone un título, descripción, dirección canónica e instrucciones de indexación coherentes con el contenido visible.

**Aceptación**:
1. **Dado** el dominio oficial, **cuando** un buscador consulta la portada, **entonces** encuentra un título y una descripción fieles al producto educativo abierto.
2. **Dado** que la portada puede abrirse con variantes de dirección, **cuando** se consulta su referencia principal, **entonces** todas señalan al dominio oficial.
3. **Dado** el mapa público del sitio, **cuando** un rastreador lo consulta, **entonces** solo encuentra páginas públicas que se desean indexar.

### Historia 3 - Compartir la portada con una vista previa útil (Prioridad: P1)

Como usuario quiero compartir XCalificator por mensajería o redes y obtener una tarjeta clara, atractiva y coherente para que el destinatario sepa qué está abriendo.

**Razón de prioridad**: El reclutamiento de docentes de prueba depende de enlaces compartidos y actualmente esos enlaces no tienen imagen ni mensaje controlados.

**Prueba independiente**: Inspeccionar la portada como servicio de vista previa y comprobar título, descripción, dirección e imagen pública completa, sin datos de sesión.

**Aceptación**:
1. **Dado** el enlace de la portada, **cuando** una plataforma compatible genera su tarjeta, **entonces** muestra la marca XCalificator, una descripción educativa y una imagen legible.
2. **Dado** un enlace a login o a una ruta privada, **cuando** intenta generarse una vista previa, **entonces** no revela nombres, materias, notas ni información de usuarios.

### Historia 4 - Orientarse por títulos sin hacer públicas las áreas privadas (Prioridad: P2)

Como usuario autenticado quiero que cada vista importante tenga un título de pestaña comprensible para orientarme, sin que mis rutas privadas sean indexadas.

**Razón de prioridad**: Un único título global dificulta identificar pestañas y el historial del navegador, pero las mejoras no deben convertir rutas académicas en contenido público.

**Prueba independiente**: Navegar entre inicio, materias, recursos, presentaciones, reportes y configuración; el título cambia de forma coherente y las rutas privadas conservan instrucciones de no indexación.

**Aceptación**:
1. **Dado** un cambio de ruta dentro de la aplicación, **cuando** termina la navegación, **entonces** la pestaña identifica la vista y mantiene la marca XCalificator.
2. **Dado** login, registro, recuperación, errores o cualquier ruta bajo `/app`, **cuando** un rastreador la consulta, **entonces** recibe una instrucción explícita de no indexarla.
3. **Dado** contenido cargado para una persona, **cuando** cambian los metadatos de la vista, **entonces** nunca incluyen nombres, correos, notas, materias privadas ni identificadores sensibles.

### Casos límite

- Un navegador antiguo que no admite el manifiesto debe conservar favicon, título y navegación normales.
- Si una plataforma no admite la imagen social preferida, debe recibir un título y descripción válidos sin mostrar un recurso roto.
- Las rutas desconocidas y páginas de error no deben formar parte del índice público.
- Los parámetros de sesión, recuperación, invitación o identificadores internos nunca deben formar parte de la dirección canónica.
- Las rutas públicas visitadas desde modo oscuro no deben producir una barra del navegador con contraste insuficiente.
- Un recurso de identidad que no cargue no debe bloquear la portada ni dejarla inutilizable.
- El acceso directo a una ruta privada sin sesión debe conservar no indexación antes y después de redirigir al login.

## Requisitos

### Requisitos funcionales

- **FR-001**: El sistema DEBE usar una identidad visual XCalificator coherente en pestañas, favoritos y accesos guardados, sustituyendo el favicon genérico actual.
- **FR-002**: La identidad DEBE conservar legibilidad y proporción en tamaños pequeños, medianos y de acceso de dispositivo.
- **FR-003**: La portada DEBE publicar un título único, una descripción útil, idioma, dirección canónica y una política explícita que permita su indexación.
- **FR-004**: La portada DEBE publicar título, descripción, dirección e imagen de vista previa compatibles con servicios sociales comunes.
- **FR-005**: La imagen compartida DEBE representar la marca y el propósito educativo, mantener texto legible y estar disponible sin autenticación.
- **FR-006**: El sitio DEBE declarar nombre completo, nombre corto, colores, inicio y conjunto suficiente de iconos para los navegadores y dispositivos compatibles.
- **FR-007**: La declaración de aplicación NO DEBE prometer funcionamiento sin conexión ni instalar un proceso en segundo plano que no forme parte del producto actual.
- **FR-008**: El sitio DEBE ofrecer colores de interfaz del navegador adecuados para apariencia clara y oscura.
- **FR-009**: Cada familia de vistas DEBE mostrar un título de pestaña específico y comprensible, seguido por la marca XCalificator.
- **FR-010**: La portada DEBE ser la única ruta indexable mientras no existan nuevas páginas públicas aprobadas.
- **FR-011**: Login, registro, recuperación, restablecimiento, errores y todas las rutas autenticadas DEBEN declarar no indexación.
- **FR-012**: Las instrucciones para rastreadores DEBEN permitir la portada y recursos públicos necesarios, sin anunciar rutas privadas como contenido indexable.
- **FR-013**: El mapa del sitio DEBE contener únicamente direcciones públicas canónicas y omitir parámetros, autenticación y rutas de aplicación.
- **FR-014**: Los metadatos NO DEBEN contener secretos, datos personales, contenido académico ni valores derivados de la sesión.
- **FR-015**: La dirección oficial publicada DEBE ser `https://xcalificator.daimuz.com/` y excluir parámetros o fragmentos.
- **FR-016**: Todos los recursos de identidad y vista previa DEBEN cargar desde orígenes permitidos por la política de seguridad vigente, sin requerir scripts de terceros.
- **FR-017**: La carga de recursos de identidad NO DEBE bloquear el contenido principal ni introducir desplazamiento visible de la portada.
- **FR-018**: El nombre, descripción y vista previa DEBEN ser consistentes con la propuesta visible: plataforma educativa de código abierto, asistencia con IA y decisión final del docente.
- **FR-019**: La navegación cliente DEBE actualizar el título y la política de indexación sin depender de recargar la página.
- **FR-020**: Deben existir verificaciones automáticas para detectar metadatos obligatorios ausentes, rutas privadas indexables o archivos de identidad inexistentes.

### Entidades clave

- **Identidad web**: Nombre, iconos, colores y representación visual usados por navegador y dispositivo.
- **Metadatos de página**: Título, descripción, dirección principal, política de indexación y datos de vista previa asociados a una ruta.
- **Ruta pública indexable**: Página accesible sin sesión y aprobada para aparecer en buscadores; inicialmente solo la portada.
- **Ruta no indexable**: Superficie de autenticación, error o aplicación privada que puede funcionar normalmente pero no debe aparecer en buscadores.
- **Tarjeta social**: Representación pública de la portada formada por imagen, título, descripción y dirección.

## Criterios de éxito

- **SC-001**: El 100 % de los contextos comprobados de pestaña, favorito y acceso de dispositivo muestran identidad XCalificator sin iconos ausentes o deformados.
- **SC-002**: El 100 % de las familias de rutas principales muestra un título comprensible después de navegar, tanto con carga directa como sin recargar.
- **SC-003**: Solo la portada resulta indexable en la matriz de rutas públicas, de autenticación, error y aplicación autenticada.
- **SC-004**: Los comprobadores de vista previa reciben título, descripción, dirección e imagen válidos desde la portada sin autenticación.
- **SC-005**: Ningún metadato inspeccionado contiene datos personales, académicos, secretos o parámetros de sesión.
- **SC-006**: No se producen solicitudes fallidas a recursos de identidad en escritorio, celular, modo claro, modo oscuro ni Brave.
- **SC-007**: La portada sigue mostrando contenido utilizable aunque el navegador ignore el manifiesto o la vista previa social.
- **SC-008**: La construcción y las verificaciones existentes continúan aprobadas, y las nuevas comprobaciones detectan al menos una omisión intencional de metadatos durante su prueba de regresión.

## Supuestos

- Se conserva la identidad visual XCalificator ya aprobada; este cambio la normaliza y no crea una marca distinta.
- `https://xcalificator.daimuz.com/` es el dominio canónico de producción.
- La portada es la única página que se desea posicionar en esta etapa.
- Login, registro y recuperación deben ser accesibles a personas, pero no aparecer en resultados de búsqueda.
- El alcance incluye metadatos y declaración de aplicación; no incluye funcionamiento sin conexión, notificaciones ni instalación de servicios en segundo plano.
- Las nuevas páginas públicas futuras deberán incorporarse explícitamente a la política de indexación y al mapa del sitio.
