# Plan: recursos y resultados coherentes del estudiante

**Rama**: `codex/091-estudiante-recursos-resultados` | **Fecha**: 2026-10-07 | **Spec**: [spec.md](./spec.md) | **Issue**: [#192](https://github.com/Andres-back/Calificator/issues/192)

**Estado**: Aprobado por el usuario el 2026-10-07 («aprovado»); lista revisada con autorización «Sí, revisa y continúa». Implementación y validación local completadas; sin autorización de merge/despliegue.

## Resumen

Corregir los cuatro hallazgos del estudiante con una presentación móvil consistente. Proteger contenido evaluativo desde backend mediante el constructor seguro existente; dirigir la resolución al flujo canónico de entrega; compartir la tarjeta de resultado entre los dos boletines y separar error de consulta de ausencia real de desglose. Sin nuevas rutas, endpoints, tablas, cambios de fórmulas ni escrituras a registros educativos.

## Contexto técnico

**Lenguajes/versiones**: TypeScript/React 18.3; Python 3.11.
**Dependencias**: React Router, TanStack Query, componentes UI actuales; FastAPI y renderizador PDF actuales. Sin dependencias nuevas.
**Persistencia**: consultas actuales a PostgreSQL; sin migraciones ni cambios a contenido almacenado.
**Pruebas**: Vitest/Testing Library, pytest y recorridos de navegador existentes más reproducción dirigida con Playwright CLI. Solo fixtures ficticios.
**Plataforma objetivo**: web/PWA en Android e iPhone, y escritorio; claro/oscuro desde 360 px.
**Rendimiento y escala**: no añadir consultas por cada tarjeta del boletín, llamadas LLM ni polling adicional. Conservar carga bajo demanda y caché existente; una acción directa por resultado.

## Verificación de la constitución

- Separación de roles: contenido seguro aplicado después de autorización/matrícula; conservar contenido completo del autor y apoyo autorizado. Las tarjetas estudiantiles no se utilizan para conceder permisos.
- Integridad y trazabilidad: consultas, enlaces y reintentos no alteran notas, evidencias, intentos, matrículas ni claves.
- Asincronía e idempotencia: continuar con consultas/reintentos existentes; no crear entregas desde la previsualización de Recursos.
- Datos y secretos: pruebas sintéticas, sin credenciales reales; sin persistencia nueva ni migraciones.
- Accesibilidad: enlaces semánticos, foco, controles de 44 px, texto legible y estados claros; no anidar botones dentro de enlaces en componentes modificados.
- Gobernanza y pruebas: alcance y plan aprobados. Checklist, Tasks y Analyze se ejecutarán antes de implementación. Pruebas dirigidas y CI obligatorios antes de merge; autorización de merge/despliegue aparte.

**Revisión tras diseño**: sin excepciones a la constitución. Aprobaciones de alcance y plan recibidas; la lista personalizada se genera sin marcar y requiere revisión del usuario o autorización para revisión asistida antes de implementar.

## Estructura del proyecto

```text
backend/app/modules/herramientas/
  service.py                  # proteger contenido evaluativo con constructor existente
  pdf_render.py               # aceptar máscara segura de crucigrama sin perder grilla/pistas
backend/tests/unit/
  test_student_activity_payload.py y pruebas existentes de permisos/PDF de recursos
frontend/src/modules/herramientas/
  StudentResourcePage.tsx      # apoyo vs actividad; una acción clara de resolver/entregar
frontend/src/modules/calificaciones/
  BoletinPage.tsx
  StudentResultCard.tsx        # única pieza compartida de presentación, solo si no hay equivalente
frontend/src/modules/materias/
  MateriaBoletin.tsx           # reutilizar tarjeta únicamente en StudentGradebook
frontend/src/modules/evaluaciones/
  ResolverEvaluacionPage.tsx   # error/reintento distinto de ausencia
```

Se ampliarán pruebas de componentes existentes; añadir prueba del visor o tarjeta si no existe. No se crean suites E2E paralelas ni archivos de resultados dentro del código fuente. Los artefactos visuales se conservan solo en `output/playwright/` ignorado.

## Decisiones y complejidad

1. **Contenido seguro**: reutilizar `build_student_activity_payload(...)["contenido"]` para la lectura de actividades desde Recursos, conservando el mismo permiso y contrato exterior de `MaterialRead`. No modificar el contenido original. Adaptar PDF para máscara/pistas seguras, sin permitir solucionario a no autores. No resolver la fuga únicamente ocultando botones.
2. **Actividad vs práctica**: para recursos interactivos evaluativos, mostrar resumen y una acción «Resolver actividad» que abre `/app/evaluaciones/:id/resolver`; no mantener un segundo formulario local que pierde respuestas o muestra resultados falsos. Apoyo conserva sus visores de práctica. Recursos no interactivos mantienen la lectura del material y acción contextual de entrega. Sin evaluación enlazada, informar indisponibilidad sin inventar enlaces ni formularios.
3. **Resultados compartidos**: evaluación y nota primero; estado/fecha compactos; «Ver explicación de mi nota» para confirmadas y retroalimentación secundaria progresiva. Reutilizar un componente pequeño en ambos boletines estudiantiles. Las listas/exports docentes permanecen intactos. Nota pendiente se distingue del cero confirmado; el enlace abre el resolver existente con ancla del resultado, sin habilitar nuevos intentos.
4. **Errores veraces**: `isError` y denegación antes que ausencia de datos. Una respuesta exitosa `null` significa «sin desglose disponible», no necesariamente «nota antigua»: el endpoint actual devuelve null en más de una situación. Error de red/500 ofrece reintento solo de consulta; 403 no presenta datos ni explicación histórica.
5. **Validación proporcionada**: regresiones de contenido/permiso/PDF y componentes afectados; typecheck/lint/build; recorrido móvil de recursos y resultados en Chromium/WebKit. No ejecutar una batería completa repetidamente, pero no omitir CI obligatorio.

No hay complejidad excepcional ni nuevas dependencias. [Research](research.md), [contratos](contracts/student-flow.md), [datos](data-model.md) y [validación](quickstart.md) documentan decisiones y aceptación.
