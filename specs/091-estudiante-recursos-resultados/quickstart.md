# Validación prevista

**Estado**: alcance/plan y revisión asistida aprobados; implementación verificada localmente. PR preparado para CI; producción sin cambios.

## Revisión previa

Lista de requisitos: requirements 16/16 y student-ux 8/8. Revisión asistida autorizada. Analyze: 13 requisitos, 17 tareas, cobertura 100%, cero ambigüedades/conflictos críticos. FR-001/002/003/004/011: T004–T008; FR-005/006/013: T009–T011; FR-007/008: T012–T013; FR-009/010/012 y SC-001–006: regresiones y T014–T016. Hooks ausentes; ignores existentes cubren artefactos, secretos y exclusión Spec Kit de imágenes. Ninguna excepción aplicada.

## Preparación

- Fixtures ficticios: estudiante matriculado/no matriculado, autor docente, apoyo y actividad publicados/ocultos; crucigrama/emparejamiento y evaluaciones con nota positiva, cero confirmado, pendiente y desglose ausente/error.
- Frontend con dependencias existentes; backend en entorno de pruebas aislado. Docker solo si está disponible; no usar datos de producción para sustituir pruebas locales.

## Pruebas dirigidas

1. Proyección segura de Recursos: ningún grid con letras, claves o soluciones evaluativas; máscara/pistas completas; autor y apoyo sin regresión.
2. PDF: grilla y pistas presentes sin letras de solución; soluciones exclusivas de autor. Casos de matrícula/publicación denegados.
3. Visor: actividad interactiva sin revelar/verificar ni respuestas locales que puedan perderse; acción de resolver válida. Apoyo mantiene práctica. Falta de evaluación enlazada comunica indisponibilidad.
4. Ambos boletines: mismo orden y etiquetas, una acción a explicación, cero confirmado distinto de pendiente, sin controles docentes.
5. Detalle: error de red/500 ofrece reintento; 403 denegación; éxito null aviso neutral; recuperación muestra desglose sin mutaciones ni doble entrega.

## Navegador y controles

- Playwright CLI: snapshot/interacción con referencias, tamaños 360/390 y 1366 px, claro/oscuro; recorrido de recurso → actividad y resultados → explicación. Chromium/WebKit representativos de Android/iPhone.
- Ejecutar pruebas de componentes afectadas, typecheck, lint y build. Reutilizar recorridos E2E existentes para regresión de aislamiento/entregas; no crear suites paralelas.
- Registrar evidencia local en este archivo al implementar. Todos los controles CI obligatorios deben quedar verdes antes de merge.
- No generar entregas, renovar claves ni modificar notas/evidencias en producción para validar este cambio. Merge/despliegue requieren autorización aparte.

## Resultados locales — 2026-10-07

- Pytest dirigido: 39 pruebas aprobadas (lectura/proyección segura, autor/apoyo, denegación, máscara PDF y constructor de actividades); Ruff de archivos backend modificados aprobado.
- Vitest: 26 pruebas aprobadas en cuatro archivos afectados (25 conjuntas y regresión adicional de carga lenta del resolver); incluye boletín docente existente, resultado estudiantil cero/pendiente, error 500 con recuperación de consulta y denegación 403. TypeScript, ESLint sin advertencias de archivos afectados y build aprobados.
- E2E existentes: 7 pruebas Chromium aprobadas (recurso/entrega y seis tamaños 360, 390, 768, 1024, 1366, 1920 px).
- Playwright CLI: cuatro vistas —recurso, boletín general, boletín de materia y detalle— en 360/390/1366 px y claro/oscuro en Chromium y WebKit. Sin overflow horizontal, botones dentro de enlaces, errores de render ni escrituras académicas. El ancla del resultado queda visible; apertura de feedback y enlace comprobados mediante referencias del snapshot.
- Evidencia local ignorada: `frontend/output/playwright/student091-results-{light,dark}-{chromium,webkit}.png`; fixtures sintéticos, sin cuentas ni datos reales. Se compactaron avisos/contadores estudiantiles para acercar la nota a la primera pantalla; UI docente intacta.
- Inventario técnico regenerado con el script existente (573 superficies, sin endpoints/tablas nuevos); lista de especificaciones del test de baseline incorpora 091. Ambos controles de gobernanza se ejecutan antes del PR.
- Docker no está activo: backend validado con Python local y fixtures aislados. Contrato HTML/PDF cubierto; build Docker y motor PDF Linux quedan a cargo de CI, sin certificar una prueba productiva.
- No nuevas dependencias, migraciones, consultas por tarjeta, llamadas LLM ni cambios de notas/usuarios/evidencias. Warning de build por chunk >500 kB conservado; no error de compilación.
