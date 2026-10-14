# Plan: retroalimentación legible y demo en el celular

**Rama**: `codex/100-feedback-demo-movil` | **Fecha**: 2026-10-14 | **Spec**: [spec.md](./spec.md) | **Issue**: [#209](https://github.com/Andres-back/Calificator/issues/209)

Estado: alcance y plan aprobados mediante «aprove»; simplificación a acceso directo manual confirmada con «si adelante». Fusión y despliegue autorizados únicamente con todos los controles verdes. El 2026-10-14, «ADELANTE» autoriza ampliar solo el límite del job frontend de 25 a 35 minutos, manteniendo todas las pruebas.

## Resumen

Evolucionar 008-calificaciones con lectura completa/edición explícita, cálculo provisional y decimales exactos; 002 con guía de acceso directo para todos los roles. Mantener APIs, cálculo, permisos, manifest y registros. Sin dependencias, backend, migraciones, inferencias, caché offline ni controlador de instalación.

## Contexto técnico

**Lenguajes/versiones**: React 18.3, TypeScript 5.6 y Tailwind existentes.
**Dependencias**: Router, Modal/UI, Vitest/Testing Library y Playwright actuales; guía manual Android/iPhone.
**Persistencia**: borradores/guardado actuales y estado de instalación transitorio en memoria; sin nuevas credenciales ni contenido académico almacenado.
**Pruebas**: unidades de formato/estado, interacción de feedback/notas, guía de acceso, regresiones focalizadas de navegación/permisos y CI obligatorio.
**Plataforma objetivo**: iPhone/Safari, Android/Chrome y computador, ambos temas desde 360 px. Emulación no acredita instalación ni teclado físicos.
**Rendimiento y escala**: sin nuevas llamadas IA ni listeners de instalación. Autosize al cambiar contenido/editor, no por cada render del roster.

## Verificación de la constitución

- Separación de roles: instalar es común; editar conserva canGrade y autorización del servidor. Bootstrap y guardas intactos.
- Integridad y trazabilidad: no altera fórmulas, notas, evidencia ni historial. Etiquetar provisional no crea ni publica una nota.
- Asincronía e idempotencia: abrir/cerrar guía no ejecuta procesos; guardado preserva errores/borradores.
- Datos y secretos: fixtures sintéticos, sin alumnos reales o proveedores; no registrar feedback, sesiones ni credenciales.
- Accesibilidad: controles 44 px, foco/Escape/retorno, diálogo desplazable, editor compatible con teclado móvil existente.
- Gobernanza y pruebas: aprobar plan, revisar checklist, Tasks y Analyze antes de código; baseline 100 e inventario actualizados al cerrar. CI verde y autorización separada de merge/despliegue.

Reevaluación tras diseño: sin excepciones; cumplimiento por diseño, no pruebas ejecutadas. Sin incógnitas técnicas pendientes que requieran delegación.

## Estructura del proyecto

- `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx`: integrar lectura/edición y explicación; preservar handlers y dirty guards de 099.
- `frontend/src/modules/calificaciones/components/`: componente pequeño de feedback, helpers de presentación, GradeBreakdown, GradeFormula y GradeComponentEditor.
- `frontend/src/lib/installedApp.ts`: reutilizar detección standalone, sin bandera persistida obsoleta.
- `frontend/src/components/install/HomeScreenShortcut.tsx`: botón y guía reutilizable con Modal, sin controlador/eventos de instalación.
- `frontend/src/main.tsx`: sin cambios; conservar limpieza deliberada de service workers/cachés.
- `frontend/src/modules/auth/LandingPage.tsx`, `LoginPage.tsx`, `frontend/src/components/layout/Topbar.tsx`: entradas sin duplicar sidebar ni alterar login.
- Tests junto a módulos y `frontend/e2e/mock/`; propietarios 002/008, índice, baseline e inventario generado. Propuesta untracked 098 intacta y fuera del PR.

## Decisiones y complejidad

1. Lectura íntegra con whitespace-pre-wrap, ancho disponible y scroll de página, sin interpretar HTML. Editar usa borrador controlado y textarea creciente. No regenerar ni resumir contenido. Cancelar con cambios exige confirmación y descarta solo feedback, no otros ajustes. Guardado autorizado actual.
2. Helper deriva pendientes por puntos null, no por falsedad de 0. `GradeFormula` recibe contexto del consumidor docente: «Cálculo provisional» si faltan puntajes; «Cálculo pendiente de revisión» si cobertura incompleta sin faltantes numéricos. No cambia resultados oficiales del estudiante. Discrepancia identifica ambos valores sin presumir decisión docente.
3. Normalización pura quita solo ceros finales. No toFixed(2) en valor editable; referencia de dirty normalizada igual. Mantener texto transitorio por tecla para no mover cursor; validar máximo exacto al guardar. 0.625 visible como 0.625, no permitir 0.63 por etiqueta redondeada.
4. Guía manual sin listener/eventos, prompts o registro de instalación. Detección standalone actual evita insistir dentro de la app; no se afirma instalación por consultar ayuda.
5. «Añadir al inicio» abre guía: iPhone Safari/Compartir/Agregar a inicio; Android menú/Agregar a pantalla principal o Instalar si aparece. Ambas guías seleccionables; navegador integrado orienta a navegador del teléfono. Computador invita a abrir sitio en celular, sin falsa descarga.
6. Botón en hero, secundario fuera del formulario login y menú de cuenta de todos los roles. Modal portaled fuera del menú condicional, cierre/foco preservados. Sin autologin o credenciales demo nuevas. Ocultar botón en standalone.
7. Validar manifest/assets existentes, no agregar service worker, paquetes PWA, permisos, tracking, APK, cambios CSP o rutas. Mantener start_url y redirección de app instalada.

Alternativas rechazadas: filas fijas, redondear valores guardados, recalificar para unificar números, confirmar instalación solo por pulsar o añadir offline durante demo.

Diseño: [research.md](research.md), [data-model.md](data-model.md), [contracts/ui.md](contracts/ui.md), [quickstart.md](quickstart.md). Lista base 16/16; revisión asistida UX y tareas autorizadas antes de código.

## Enmienda de entrega autorizada

El CI del HEAD 72a066d agotó el límite de 25 minutos después de aprobar unidades y 185 E2E generales; los escenarios contextuales aún se ejecutaban. Ampliar únicamente `jobs.frontend.timeout-minutes` a 35 en `.github/workflows/ci.yml` permite completar la suite obligatoria con margen acotado. No modifica pasos, pruebas, permisos, otros límites ni código de aplicación. El nuevo HEAD debe superar todos los controles antes de fusionar; no hay bypass ni despliegue manual.
