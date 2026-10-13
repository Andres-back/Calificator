# Validación propuesta

Estado: plan y revisión de lista aprobados el 2026-10-13. Implementación y validaciones locales ejecutadas; entrega pendiente de CI remoto, sin fusión ni despliegue. Pruebas solo con datos sintéticos; no inferencias LLM ni mutaciones de producción.

## Preparación

Usar dependencias, fixtures, permisos y configuración de navegador actuales. Grupos de 30 y nombres largos; modalidades física/online/mixta, borrador/publicada, calificación pendiente/decidida/en proceso y rol estudiante sin privilegios. Marcadores locales no incluyen información educativa ni credenciales.

## Pruebas focalizadas

En `frontend/`, ejecutar unidades de DashboardPage, MateriaDetailPage, MateriaEvaluaciones, MateriaBoletin, MateriaCalificar y marcador de navegación que se añada. Conservar regresiones de nota/escala, guardado de puntos y borradores del workspace. Ejecutar typecheck, lint y build. Documentar comandos/casos reales, no resultados previstos como aprobados.

Extender los E2E actuales y filtrar los casos de 095 y regresiones realmente afectadas; usar Chromium y WebKit. Matriz 360/390/768/1280/1440 claro/oscuro. Verificar foco, menús, acceso a filtros, teclado, regreso de previsualización y ausencia de scroll horizontal. En 390 × 844, comprobar primera ficha completa en la pantalla inicial del boletín con fixtures controlados.

## Escenarios imprescindibles

1. Materia/grado visible; acciones por estado/permiso; abrir menú, editar/criterios y confirmación de eliminar sin efectuar destrucciones reales.
2. Boletín: buscar, aplicar filtro, cerrar panel, reconocer filtro activo, seleccionar alumno, previsualizar, exportar y regresar sin perder contexto.
3. Revisión: nota primero, aviso activo visible, historial cerrado, evidencia de varias hojas, puntajes, ajuste sin guardar y navegación protegida.
4. Continuar: recuperar alumno/evaluación desde inicio; sin marcador, malformado, caducado, almacenamiento denegado, cuenta distinta, sesión perdida y evaluación/alumno eliminado. Cero filtración de cuenta previa o destino externo.
5. Captura: 30 alumnos, IDs repetidos/ajenos, entregas en cola, notas manuales, último alumno, fallo/refresco parcial, elegir siguiente y búsqueda manual. Progreso preciso y etiquetas veraces; ni selección silenciosa ni reaprovechamiento de hojas.
6. Registrar cero escrituras académicas en consulta/navegación. Envío explícito conserva paquetes y contexto; fallo conserva evidencia y no avanza. Regresiones de autenticación por limpieza de marcador y permisos mantienen resultados.

## Cierre

Lista, tareas y Analyze antes de código; Converge después. Actualizar propietarios/índice/baseline/inventario sin eludir controles. PR con CI verde y aprobación independiente antes de fusionar/desplegar. Guardar capturas sintéticas ignoradas por Git y registrar resultados reales al ejecutar; no prometer exactitud universal de IA ni aceleración del backend por cambiar interfaz.

## Evidencia local

- Lista base 16/16 y UX-demo 10/10 revisadas con autorización; Analyze: 12 requisitos, 16 tareas, 100 % de cobertura, cero conflictos críticos.
- Unidades focalizadas: 114 aprobadas en 11 archivos; después, 33 aprobadas en las suites de captura/inicio con el caso adicional de último alumno (115 casos únicos cubiertos). Incluye identidad/cuenta, referencias malformadas/caducadas, almacenamiento denegado, sesión perdida, criterios, escala, ajuste y edición de puntos.
- Typecheck y lint aprobados; build aprobado con avisos no bloqueantes de tamaño de chunks/tiempo de plugins. Sin paquetes nuevos ni cambios de backend.
- Chromium: 11 recorridos aprobados en la ejecución de matriz (diez casos 360/390/768/1280/1440 claro/oscuro + captura). Antes se ejecutó un recorrido móvil para depurar la referencia del botón de cancelación («Conservar»), sin modificar la confirmación existente.
- WebKit: 4 recorridos aprobados en 360/390 claro/oscuro. Es comprobación del motor, no certificación de dispositivos físicos ni teclado nativo.
- Regresiones responsive antiguas: 3 aprobadas (boletín 390 claro, guardar/reabrir criterios 390 y guía/permisos personalizados). Los textos actualizados mantienen la comprobación de permisos; filtros/menú se despliegan antes de buscar controles secundarios.
- Revisión explicable anterior: 2 recorridos aprobados, resumen móvil sin mutaciones y ajuste de 1 a 0.7 con historial sin publicación. No se reescribieron reglas de nota para este cambio.
- Capturas `output/playwright/teacher-flow/boletin095-*` ignoradas por Git. Inspección manual de 390 claro y 1280 oscuro: primera ficha completa en celular, grado visible, filtros secundarios cerrados y mosaico legible. Las pruebas comprueban cero escrituras académicas al consultar, desplegar, continuar o cancelar eliminación.
- La captura sintética comprueba cuatro acciones, refresco/fallo con hojas conservadas, progreso tras aceptación, elección explícita de siguiente alumno y ausencia de publicación. Los 503 provocados por el fixture son casos de recuperación, no errores de producción.
- Docker no estaba disponible. No se reinició ni usó producción como entorno de pruebas. Se reutilizó Python 3.12.14 incluido en la app para regenerar/validar inventario y el validador de PR; no tiene pytest instalado. Suite de gobernanza y backend Python 3.11 se verifican en CI antes de cualquier merge, sin atribuirles resultado local.

## Convergencia y entrega

Converge: 12 requisitos funcionales, 6 criterios de éxito, 9 escenarios de aceptación, 7 decisiones del plan y 8 principios de la constitución revisados. Sin brechas funcionales, cambios ajenos al alcance ni tareas adicionales. No modificó tareas al evaluar; se actualizaron sus marcadores en Implement según ejecución real. La evidencia de claridad de nota usa la presentación 094 y sus regresiones conservadas, no una nueva fórmula.

Inventario regenerado y vigente con 573 superficies, mismos propietarios y contratos; la nueva prueba de sesión añade referencias de cobertura de dominio sin afirmar pruebas nuevas sobre cada endpoint. 095 registrado en baseline sin retirar aserciones.

Entrega en rama `codex/095-flujo-docente-ligero`, PR con `Closes #200` y etiquetas de aprobación. Estado inicial de CI debe consultarse al abrir; resultado remoto pendiente, sin fusión/despliegue. La validación de motor de navegador no equivale a un ensayo con profesores reales ni garantiza exactitud de todas las inferencias IA.

## Corrección tras CI

El primer CI (`38358336108`) aprobó backend, contenedores y gobernanza. En frontend aprobó 151 recorridos y fallaron ocho: retorno de la previsualización del boletín en 768/1280, ambos temas y motores. La devolución automática del foco desplazaba la lista 80 px. Se conserva la aserción exacta de posición y se añade `preventScroll` al devolver el foco en Modal, sin cambiar datos ni reglas de nota. Regresión unitaria falla antes de la corrección y pasa después. Validación focalizada posterior: 24 unidades aprobadas (Modal, boletín y visor de evaluación), typecheck/lint aprobados y ocho recorridos fallidos ahora aprobados en Chromium/WebKit. También pasan los cuatro recorridos de 390 px claro/oscuro en ambos motores. CI remoto deberá ejecutarse de nuevo antes de fusionar. El usuario autorizó continuar la entrega; se mantiene el requisito de todos los controles verdes antes de fusionar y verificar producción.
