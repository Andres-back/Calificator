# Plan: Frontend docente claro y contextual

**Rama**: `codex/138-frontend-docente-claro` | **Fecha**: 2026-10-30 | **Spec**: [spec.md](./spec.md) | **Issue**: #295

## Resumen

Aplicar el plan aprobado en dos incrementos comprobables: (1) simplificar lectura, términos, CTA y pestañas móviles; (2) contexto docente y Pendientes. Reutilizar componentes y contratos; no modificar backend, datos, proveedores ni permisos efectivos. La revisión de requisitos y Analyze preceden al código funcional.

## Contexto técnico

**Lenguajes/versiones**: TypeScript/React18; React Router6 y TanStack Query5 actuales; Node22; Python3.11 para gobernanza.
**Dependencias**: las del lockfile vigente; lucide/tokens/UI existentes, sin paquetes nuevos.
**Parche de seguridad autorizado**: al cerrar la auditoría se detectó GHSA-mrwp-f3q8-3g9p. El usuario autorizó exclusivamente follow-redirects1.16.1→1.16.2 en el lockfile y repetir regresiones; sin actualizar KaTeX ni otras librerías. No añade una dependencia ni cambia la configuración de producción.
**Persistencia**: ninguna migración ni escritura nueva; querystring/router y borradores actuales. Solo datos sintéticos en pruebas, sin usar la copia real de producción.
**Pruebas**: Vitest/RTL, Playwright Chromium/WebKit, tsc/lint/build, acciones/build público, inventario y gobernanza. Regresiones de permisos/borradores, puntajes137, fotos/zoom, boletines y enlaces públicos.
**Plataforma objetivo**:360/384/390/768/1440px, claro/oscuro,200% de texto, teclado/táctil; emulación no equivale a teléfono físico.
**Rendimiento y escala**: bandeja usa una consulta autorizada por ciclo, cero consultas por evaluación para completar muestras, sin IA. No añadir polling propio al workspace.

## Verificación de la constitución

- Separación de roles: guard contextual y compatibilidad sin subjects.read; bandeja gated submissions.review; no exponer análisis a estudiante. Pruebas permitidas/denegadas por ruta y fixture.
- Integridad y trazabilidad: extraer presentación técnica a Historial, sin editar DTO/modelo ni criterios, datos o políticas de compartir. Navegación cero escrituras; borradores conservados.
- Asincronía e idempotencia: reutilizar acciones/guards/reintentos existentes; no generar enlaces ni trabajos al entrar a rutas o cambiar pestaña.
- Evolución/datos y secretos: solo frontend/plantillas/documentación; no tocar schema/backend ni respaldos cifrados, nada real en capturas o CI.
- Accesibilidad:44px, nav enlaces con aria-current, foco/scroll solohorizontal al revelar tab, una flecha en overlay móvil, ayudas cerradas semánticas, estados/error no solo por color.
- Portabilidad IA: cero cambios o llamadas a proveedores/modelos.
- Gobernanza/pruebas: issue/rama/spec/plan aprobados, revisión de checklist, Tasks/Analyze antes de Implement; Converge antes de PR; main/producción solo por CI verde sin bypass.
- Despliegue: esta tarea prepara código/PR; no incluye despliegue manual ni escrituras productivas. Rollback por revert de código compatible.

## Estructura del proyecto

```text
frontend/src/modules/calificaciones/
  reviewRoutes.ts + tests             # matcher/constructores y compatibilidad
  ReviewContextNavigation.tsx + tests # ubicación y vuelta de nivel
  components/ReviewHelp.tsx           # ayuda general, no avisos específicos
  components/GradeAnalysisDetails.tsx # historia técnica por pregunta
  components/GradeBreakdown.tsx       # lectura principal sin ruido
  CalificacionesWorkspace.tsx        # integrar componentes sin duplicar estado
frontend/src/modules/feedback_sharing/ # términos y CTA individual único
frontend/src/modules/materias/         # tabs e iniciadores de revisión
frontend/src/modules/dashboard/TeacherInbox.tsx
frontend/src/config/{nav,routes}.ts
frontend/src/components/layout/{AppShell,Topbar}.tsx
frontend/src/lib/analytics.ts
frontend/src/router.tsx
frontend/e2e/teacher-review-context.spec.ts
.specify/templates/{spec,plan,tasks}-template.md
specs/{005-evaluaciones,008-calificaciones,074-optimizar-frontend,
       138-frontend-docente-claro,system-inventory}/
```

Las rutas existentes de Materias y resultados estudiantiles no cambian. Los iniciadores actualizados usan un único constructor; consumidores antiguos conservan firmas o adaptadores.

## Decisiones y complejidad

Ver [research.md](./research.md), [contrato](./contracts/frontend.md) y [modelo](./data-model.md).

1. Ruta contextual hermana del layout, no workspace anidado ni duplicado. Path IDs como autoridad; error si getEvaluacion devuelve materia distinta. QueryIDs contradictorios nunca habilitan acciones.
2. changeContext y returnToReview mantienen ruta y query sincronizadas. No se canonicaliza silenciosamente un enlace activo con borrador; enlaces globales siguen compatibles. Menú sin selección muestra Pendientes si tiene permiso, y elegir evaluación si no lo tiene.
3. En alumno: lista vuelve a evaluaciones de la materia; alumno vuelve a lista de evaluación. En móvil solo una flecha dentro del overlay; libro como acción secundaria sin flecha. Filtros/volver seguros y pregunta/hoja no se borran salvo por cambio explícito de contexto como hoy.
4. Technical details puros y sin fetch; fuentes/valoraciones copiadas de DTO docente actual. Sin permisos nuevos ni exponerlos a resultado público.
5. Copy auditado en superficies afectadas y accesibilidad, no reemplazo masivo sobre contenido de usuario. Las etiquetas técnicas de eventos/campos se conservan.
6. Plantillas requieren sustracción y evidencia visual; no ampliar tests a todas las specs históricas ni convertir placeholders en aprobación automática.

## Fases y condiciones de paso

- Diseño: especificación16/16, checklist UX8puntos de revisión humana/delegada, maqueta sintética384/1440 y mapa añade/reutiliza/retira. Sin extender alcance fuera del plan aceptado.
- Incremento1: tests RED → ayuda/historial/copy/CTA/tabs → unidades y capturas; no tocar rutas hasta estabilizarlo.
- Incremento2: tests de contrato/rutas/permisos → contexto/bandeja → iniciadores y guards → E2E con enlaces antiguos/directos/borradores.
- Cierre: dos temas/384 y escritorio, texto200%, scroll y teclado; tipos/lint/unidades/build, inventario/regresiones/gobernanza, Converge y PR sin fusión automática no autorizada.

**Constitution Check posterior al diseño**: sin excepciones a principios. La bandeja completa por evaluación queda fuera porque requiere otro contrato backend; se entrega la muestra con totales honestos. La simplificación no puede retirar advertencias que impiden publicar salidas inconsistentes.
