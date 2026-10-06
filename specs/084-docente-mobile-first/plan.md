# Plan: Docente primero en celular

**Rama**: `codex/084-docente-mobile-first` | **Fecha**: 2026-10-05 | **Spec**: [spec.md](./spec.md) | **Issue**: [#174](https://github.com/Andres-back/Calificator/issues/174)

**Estado**: plan aprobado por el usuario («aprove», 2026-10-05). Checklist, tareas y análisis previos a implementación; todavía no se despliega.

## Resumen

Completar cinco recorridos docentes con celular como dispositivo principal: visualizar el examen sin abrir otro visor, editar criterios sin reconstruir preguntas, navegar por materias con información progresiva, registrar alumnos y entregar fichas de acceso, y editar la cuenta propia. Se reutilizan los módulos y contratos existentes; las adiciones de API serán compatibles. No se modifica el motor de IA, publicación, cálculo de notas ni registros históricos.

## Clarificación y diagnóstico

No se necesitaron preguntas adicionales: las decisiones de alcance están en los supuestos aprobados de la especificación. La lista de requisitos contiene 16 comprobaciones aprobadas por revisión documental. [Diagnóstico](diagnostico.md) y [decisiones técnicas](research.md) proceden de lectura del checkout base `8ccedc5ea4aec6bd31f4abd93ca47c8aa21f8687`; no constituyen pruebas de producción.

## Contexto técnico

**Lenguajes/versiones**: Python 3.11/FastAPI/SQLAlchemy asíncrono; TypeScript, React 18, React Query 5 y Vite 8. Node local 22.14.0; comprobar también el runtime fijado de CI/Docker antes de añadir dependencia.
**Dependencias**: conservar las existentes. Única dependencia prevista: `pdfjs-dist` fijada inicialmente a `6.4.299` en manifest y lockfile, cargada bajo demanda y con worker/recursos del mismo origen; validar compatibilidad y auditoría al instalar. El metadato oficial consultado exige Node >=22.13.0 o >=24. No instalar en esta fase.
**Persistencia**: PostgreSQL y modelos actuales; sin migración prevista. El alta manual usa el ID UUID existente del lote como clave de operación; la actualización de criterios compara `updated_at` existente. Nunca almacenar contraseñas en texto.
**Pruebas**: Vitest/Testing Library, pytest con base aislada para concurrencia y relaciones, Playwright real con fixtures ficticias y comprobación de contenido renderizado, permisos y medios de impresión. CI aplicable completo antes de merge.
**Plataforma objetivo**: 360×800 y 390×844 primero; 768×1024, 1366×768 y 1920×1080; claro/oscuro. Chromium y WebKit automatizados; Brave e iPhone reales cuando estén disponibles, sin afirmar que una emulación equivale al equipo físico.
**Rendimiento y escala**: una página PDF renderizada a la vez, máximo 4 megapíxeles de canvas por página y escala limitada según ese presupuesto; cancelar tareas y liberar documento/canvas al cerrar o cambiar. El worker y visor no entran al bundle inicial. Altas de hasta 100 nombres por lote, como el contrato existente. Doble confirmación no duplica identidades. La búsqueda y el scroll permanecen utilizables durante consultas; no se envían nuevas solicitudes de IA para visualizar, imprimir o editar criterios.

## Verificación de la constitución

- Separación de roles: cumple por diseño. Solucionario mantiene autorización del exportador; criterios exigen permisos y propiedad; altas y renovación requieren `subjects.update` y materia gestionable. Perfil solo opera sobre el usuario autenticado y rechaza campos administrativos. Pruebas de denegación en cada operación.
- Integridad y trazabilidad: cumple por diseño. PATCH de criterios no contiene preguntas, respuestas ni estado. Pruebas comparan antes/después preguntas, blueprint compatible, notas, evidencia, entregas e historial; no se recalifica. Auditar acciones sin incluir secretos ni cuerpos sensibles.
- Asincronía e idempotencia: cumple por diseño. Visor usa worker y cancelación; digitalización por foto conserva jobs existentes. Alta manual y confirmación transaccionales, con recuperación de estado y replay sin regenerar credenciales. No se añade un trabajo de IA a una operación manual.
- Datos y secretos: cumple por diseño. UUID y `updated_at` actuales evitan esquema nuevo. Credenciales recién emitidas permanecen en memoria efímera; cierre, cambio de contexto o logout las eliminan. Impresión privada y ninguna contraseña personal recuperable.
- Accesibilidad: cumple por diseño. Controles >=44×44, encabezado breve, un scroll principal, ayudas cerradas, navegación de páginas accesible, alternativa de lectura textual y errores explícitos. Probar teclado abierto, orientación y zoom.
- Gobernanza y pruebas: plan aprobado; antes de implementación, revisar Checklist y completar Tasks/Analyze. Después: Implement y Converge; PR vinculado a #174, controles verdes y autorización de fusión/despliegue. Nunca push directo a main.

Reevaluación posterior al diseño: sin excepciones constitucionales ni aclaraciones técnicas abiertas. Cumplimiento funcional pendiente de implementación y evidencia de pruebas; no se declara CI verde por documentación.

## Estructura del proyecto

Se trabajará en archivos existentes siempre que sea razonable; componentes nuevos pequeños solo si evitan duplicar responsabilidades.

- `frontend/src/modules/evaluaciones/`: visor, editor de criterios y rúbrica, integración en revisión y API; pruebas actuales extendidas.
- `frontend/src/modules/materias/`: encabezado/secciones, registro manual, revisión de lista y fichas imprimibles; API y pruebas actuales.
- `frontend/src/components/layout/Topbar.tsx`, `frontend/src/router.tsx`, `frontend/src/config/routes.ts`, `frontend/src/stores/auth.ts`: acceso a perfil y sincronización de identidad.
- `frontend/src/modules/users/` (módulo pequeño nuevo): página propia, cliente y formularios; no reutilizar el panel administrativo como perfil.
- `frontend/src/index.css`: impresión aislada y ajustes responsivos; nada de ocultar toda la página fuera del medio print.
- `backend/app/modules/evaluaciones/`: precondición compatible y actualización limitada, conservación de criterios históricos.
- `backend/app/modules/importacion_estudiantes/`: lote manual y recuperación idempotente, permisos y renovación confirmada.
- `backend/app/modules/users/`, `backend/app/modules/auth/`: autoedición protegida y salida de sesión clara al cambiar contraseña; mantener helpers actuales de cookies y CSRF.
- `frontend/e2e/`, `backend/tests/` y tests frontend colocados junto a componentes: cobertura dirigida y regresiones de contratos.
- `specs/084-docente-mobile-first/`, índice e inventario canónico si cambian endpoints/rutas: documentación viva. No asignar responsabilidad canónica de todas las tablas a 084; evoluciona 003, 005, 007 y los módulos de UX/importación existentes.

## Diseño y secuencia de implementación posterior

### 1. Vista previa dentro de XCalificator

Reutilizar `GET /api/evaluaciones/{id}/pdf?soluciones=false` y su blob autenticado; Word conserva `/docx?soluciones=false`. Sustituir el iframe como visor principal por PDF.js lazy con worker empaquetado localmente. Página anterior/siguiente, «Página n de N», ajuste al ancho y ampliación limitada; ninguna página se pierde por virtualización. Mantener descarga PDF/Word y apertura externa como alternativas, no como requisito para ver el examen.

Cancelar descarga/render anterior, limpiar páginas privadas y canvas inmediatamente al cambiar evaluación o solucionario. El documento inicial nunca contiene solucionario. Capa textual/alternativa accesible, foco restaurado al cerrar y errores con reintento. No ampliar CSP con `unsafe-eval`, CDNs ni dominios arbitrarios; utilizar opciones sin evaluación dinámica. Revisar con ejemplos reales ficticios que el exportador canónico conserve todos los formatos ya compatibles; PDF.js no repara por sí mismo imágenes/fórmulas que el exportador omita. Cualquier limitación preexistente no cubierta debe registrarse, no ocultarse detrás de una prueba que solo encuentre un iframe.

### 2. Criterios y rúbrica sin tocar preguntas

Mostrar «Criterios y rúbrica» a una acción desde la revisión del examen digitalizado y desde su evaluación guardada. Editor limitado a selección de criterios y rúbrica, reutilizando `DBASelector`, `dbaApi` y las reglas de `RubricEditor`. Texto visible «Criterios de aprendizaje»; conservar identificadores internos DBA por compatibilidad.

Usar PATCH con únicamente campos modificados de `dba_ids`, `dba_personalizado_ids`, `criterios` y `expected_updated_at`. Comprobar versión bajo bloqueo de fila; 409 conserva cambios locales y permite comparar/recargar antes de volver a guardar. No enviar preguntas, clave, modalidad, nota máxima ni material de origen. Rúbricas antiguas no editadas no se normalizan. Referencias históricas inactivas del contexto autorizado se pueden conservar, pero no añadir como una selección nueva; referencias ajenas/inexistentes se rechazan. Aplicar esta distinción sin alterar la política general del catálogo oficial existente en este cambio.

Crear criterio en materia desde el editor con `dba.manage`, luego seleccionarlo explícitamente. La invalidación del catálogo no reinicializa el asistente ni borra borradores. Inicializar wizard por apertura e identidad, no por identidad del array `availableMaterias`; sincronizar solo los criterios guardados cuando corresponda. Aviso claro si hay entregas/notas: afecta futuras valoraciones, no cambia las existentes.

En servidor, distinguir el PATCH limitado: actualizar solo selección/contexto de criterios y rúbrica del blueprint, manteniendo literalmente sus preguntas y claves existentes. No pasar estos campos históricos por `build_blueprint_payload` si la reconstrucción los normaliza. El flujo estructural de edición de preguntas conserva su contrato y pruebas actuales.

### 3. Materia breve, ayuda progresiva

Encabezado con nombre y selector de sección primero. Área, grado, descripción, código de inscripción y guía extensa en detalles opcionales. Mantener estudiantes en su ruta actual, con etiqueta comprensible; no añadir otra ruta vacía por cambiar el nombre visible. Quitar recomendaciones/acciones duplicadas de `TeacherJourney` en la entrada a materia, manteniendo ayuda opcional.

Revisar Evaluaciones, Recursos, Estudiantes/Vista general, Asistencia, Notas/Boletín y Criterios. Acción principal primero; errores, estados de IA, avisos de cambios sin guardar y permisos permanecen visibles. Calificar/Notas siguen en cada evaluación. Sin paneles sticky altos, scrolls anidados que atrapen gestos ni formularios tapados por teclado.

### 4. Alta manual/foto y fichas

Añadir lote manual revisable sin upload/modelo, con hasta 100 filas y UUID de operación reutilizado tras pérdida de red. Reutilizar validación de filas, homónimos, confirmación y matrícula existentes. Transacción/constraint resuelven requests concurrentes; actor/materia/origen/huella deben coincidir en replay. No deduplicar personas solo por nombre.

Separar guardar filas de confirmar en el cliente. Si la confirmación se comprometió pero se perdió la respuesta, recuperar estado y conteos del mismo lote; nunca crear otro ni repetir una escritura inválida sobre un lote confirmado. El secreto emitido no se recupera desde almacenamiento: informar la situación y ofrecer renovación explícita autorizada.

Un componente de fichas para resultados de foto, manual y renovación: selección individual/todos, nombre, usuario, clave temporal, dirección de login e instrucción de cambio. Portal de impresión aislado y stylesheet print, sin imprimir el resto de la aplicación; cancelar o imprimir no llama a renovación. Limpiar secretos del estado y mutation cache al cerrar/cambiar contexto/logout.

Renovación actual con confirmación previa, permiso efectivo, cuenta interna matriculada y bloqueo transaccional. Advertir que cambia el acceso del alumno en todas sus materias, incluso si ya cambió su clave; nunca mostrar la contraseña anterior. Cuentas con correo real mantienen su recuperación existente. El docente no obtiene control de roles o de alumnos ajenos por este flujo.

### 5. Mi perfil

Ruta lazy `/app/perfil` desde menú de cuenta. Formularios pequeños: datos personales y contraseña. Usar `GET/PATCH /api/users/me`, con `current_password` adicional solo en autoedición. Nombre completo conserva columna actual; no migrar nombre/apellidos. Email/password requieren contraseña actual; confirmación de nueva clave en cliente antes del envío. Rechazar nulls explícitos/campos administrativos y nombres vacíos.

Wrapper `update_self_user` verifica y bloquea cuenta antes de mutar, sin imponer estas reglas al administrador, recuperación o cambio inicial. Contraseña actual errónea produce 422 de campo, no 401 que dispare refresh automático. Nombre/email actualizan auth store mediante `fetchMe`; email cambiado invalida enlaces de recuperación anteriores. Cambio de contraseña conserva incremento de `auth_version`, invalida recovery pendiente, limpia cookies con helper actual, limpia sesión/cachés privados y dirige al login con confirmación «Inicia sesión con tu nueva contraseña». No reemitir silenciosamente tokens antiguos ni dejar un 401 sorpresa en la siguiente navegación.

## Cobertura y aceptación

| Requisitos | Evidencia exigida |
|---|---|
| FR-001–002 / SC-001 | PDF multipágina realmente pintado y texto visible; página última, zoom, cierre y cambio de solucionario sin datos antiguos; descargas y denegaciones. |
| FR-003–005 / SC-002 | Crear/seleccionar criterios desde revisión; pesos válidos/invalidación; PATCH limitado; fixture de material con metadatos y claves complejas preservados; notas/entregas/historial intactos; conflicto 409. |
| FR-006 / SC-003 | Todos los apartados vacíos/poblados; nombre/selector en primer viewport y ayuda cerrada; funciones principales conservadas. |
| FR-007–010, FR-013 / SC-004,006 | Foto/manual/replay concurrente/homónimos/asociación; impresión solo seleccionados; imprimir/cancelar cero llamadas de renovación; permisos; ninguna persistencia de secretos. |
| FR-011–012 / SC-005 | Datos válidos, correo duplicado, clave actual errónea, nueva confirmación, role injection denegada, antiguos access/refresh inválidos y login posterior correcto. |
| FR-014–015 / SC-007 | Cinco recorridos en matriz móvil/tablet/escritorio, claro/oscuro, teclado/scroll/foco y >=44×44; pruebas dirigidas locales y CI completo aplicable antes de PR/merge. |

Guía ejecutable y límites de evidencia: [quickstart.md](quickstart.md). No se considera terminado un test de integración omitido por falta de base ni una prueba visual vacía.

## Decisiones y complejidad

PDF.js añade peso únicamente al abrir el visor y evita rasterización adicional en el VPS de calificación. Se rechaza continuar dependiendo del iframe, duplicar un exportador HTML y añadir PNGs privados persistentes. La nueva dependencia requiere build/auditoría y prueba WebKit; fallo de estos controles bloquea la entrega.

No introducir tablas de contraseñas recuperables, segundo servicio de creación de alumnos, motor nuevo de rúbricas, nueva sección de calificación ni campos separados de apellidos. El plan añade un endpoint manual y dos campos de control compatibles; el resto reutiliza APIs actuales. No hay excepción constitucional ni autorización de despliegue implícita.
