# Plan: Optimizar fluidez y organización del frontend

**Rama**: `codex/074-optimizar-frontend` | **Fecha**: 2026-09-26 | **Spec**: [spec.md](./spec.md) | **Issue**: [#155](https://github.com/Andres-back/Calificator/issues/155)

## Resumen

Se optimizará la experiencia sin cambiar contratos ni datos: se consolidará la actualización remota para que solo los procesos transitorios mantengan seguimiento periódico; se protegerá con pruebas el debounce ya existente del buscador de calificaciones; se servirán recursos de marca WebP ajustados al tamaño real; se filtrarán de la precarga inicial pública los chunks de gráficas, Markdown y exportación; y se reorganizarán navegación móvil y acciones repetidas con componentes actuales.

La ejecución será incremental: primero regresiones y rendimiento, después navegación y jerarquía. No se refactorizarán componentes monolíticos si hacerlo no es necesario para satisfacer la especificación.

## Contexto técnico

**Lenguajes/versiones**: TypeScript 5.6, React 18.3, Vite 8.1
**Dependencias**: TanStack Query 5.59, React Router 7.18, Tailwind CSS 3.4, Vitest 4.1, Playwright 1.61
**Persistencia**: sin cambios; estado local y caché de consultas existentes
**Pruebas**: Vitest/Testing Library, auditoría de acciones, Playwright responsive, accesibilidad y regresión visual
**Plataforma objetivo**: navegadores modernos de escritorio y móvil desde 360 px, incluido Safari iOS y Brave
**Rendimiento y escala**: transferencia pública propia inferior a 2,20 MB frente a 3,67 MB base; cero polling en vistas estudiantiles estables; una consulta por ráfaga de búsqueda

## Verificación de la constitución

- Separación de roles: cumple; no se cambian permisos, rutas protegidas ni consumidores por rol y se mantienen pruebas de aislamiento.
- Integridad y trazabilidad: cumple; no se modifica cálculo, confirmación, publicación, evidencia ni historial de notas.
- Asincronía e idempotencia: cumple; se conserva polling condicional para estados `queued`, `running`, `recibida` o `procesando` y se elimina solo el periódico incondicional.
- Datos y secretos: cumple; no hay migraciones, almacenamiento nuevo ni credenciales.
- Accesibilidad: cumple; select nativo móvil, objetivos de 44 px, texto visible y pruebas en claro/oscuro.
- Gobernanza y pruebas: cumple; issue #155, especificación aprobada, tareas trazables, pruebas y PR obligatorio.

## Estructura del proyecto

```text
frontend/
├── public/branding/                         # variantes WebP optimizadas
├── src/modules/auth/                        # landing y acceso
├── src/modules/calificaciones/              # prueba del debounce y boletín estable
├── src/modules/dashboard/                   # jerarquía por rol y bandeja compacta
├── src/modules/evaluaciones/                # actualización condicional
├── src/modules/materias/                    # selector móvil y actualización estable
├── src/modules/xali/                        # recursos optimizados y actualización estable
├── src/components/layout/                   # logo optimizado
├── src/modules/xali/components/             # avatares WebP
├── e2e/                                     # contratos responsive/rendimiento
└── vite.config.ts                           # precarga pública acotada

specs/074-optimizar-frontend/
```

## Decisiones y complejidad

- **Consultas estables sin intervalo**: se conserva actualización al recuperar foco e invalidaciones existentes. Se rechazó aumentar el intervalo porque mantiene tráfico y trabajo de render innecesario.
- **Procesos activos con intervalo**: presentaciones, importación, entrega en procesamiento y revisión activa conservan polling condicional. Se rechazó quitarlo globalmente porque ocultaría progreso real.
- **WebP estático dimensionado**: se crean variantes WebP para los recursos consumidos y se conservan originales como fuente. Se rechazó AVIF exclusivo por compatibilidad y coste de codificación en equipos modestos.
- **Selector móvil de materia**: por debajo de `md` se usa un select nativo que indica la sección actual; las pestañas se conservan desde `md`. Se rechazó depender de una barra horizontal sin señal visual.
- **Sin relajación de CSP**: no se agregan `unsafe-inline`, comodines ni dominios publicitarios. El bloqueo por extensiones/Cloudflare se documenta como ruido externo.
- **Precarga por tipo de host**: Vite 8 permite filtrar dependencias solo para la entrada HTML; los chunks siguen cargándose al navegar a su ruta. Se evita desactivar toda la optimización.
- **Sin refactor masivo**: `CalificacionesWorkspace` conserva su estructura; el debounce existente se cubre con regresión. La división del componente queda fuera de alcance para reducir riesgo.
