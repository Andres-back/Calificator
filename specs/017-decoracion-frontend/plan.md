# Plan: Decoración visual transversal

**Rama**: `codex/017-decoracion-frontend` | **Fecha**: 2026-08-21 | **Spec**: [spec.md](./spec.md) | **Issue**: #22

## Resumen

Ambientar las superficies compartidas del frontend con un recurso ilustrado original, capas decorativas no interactivas y estados visuales más coherentes. La implementación se limita a presentación: no cambia rutas, contratos, permisos, consultas ni acciones. Se reutilizan la identidad, los componentes y los tokens existentes; la ilustración funciona como mejora progresiva y la interfaz conserva un fondo legible si el archivo no carga.

## Contexto técnico

**Lenguajes/versiones**: TypeScript 5.6, React 18, CSS y HTML.
**Dependencias**: Tailwind CSS 3.4, React Router, componentes y recursos de marca existentes; no se añaden dependencias de ejecución.
**Persistencia**: Solo preferencia local no sensible para recordar por rol, guía y versión si un recorrido de primera visita ya fue presentado; no se modifican datos de negocio.
**Pruebas**: Vitest, ESLint, TypeScript, Vite build y Playwright para accesibilidad/responsividad.
**Plataforma objetivo**: Navegadores modernos en 360×800, 390×844, 768×1024, 1366×768 y 1920×1080; modo claro y oscuro.
**Rendimiento y escala**: Recurso raster único, diferible y no crítico; sin incremento de solicitudes de API ni bloqueo de interacción.

## Verificación de la constitución

- Separación de roles: cumple; la ambientación se selecciona desde el rol ya autenticado y no agrega acciones.
- Integridad y trazabilidad: cumple; no se modifica calificación, entregas, evidencias ni historial.
- Asincronía e idempotencia: no aplica; no se agregan trabajos ni efectos de negocio.
- Datos y secretos: cumple; el recurso no contiene información de usuarios, credenciales ni texto generado.
- Accesibilidad: cumple; recursos ignorados por asistencia, contraste por tema, 360 px y movimiento reducido.
- Gobernanza y pruebas: cumple; issue #22, spec 017, rama protegida, tareas, pruebas y PR.

## Estructura del proyecto

```text
frontend/
├── public/branding/
│   └── learning-atmosphere-v2.webp
├── scripts/
│   └── audit-actions.mjs
├── src/components/layout/
│   ├── AppShell.tsx
│   └── PageHeader.tsx
├── src/components/ui/
│   ├── EmptyState.tsx
│   └── useFirstVisitTour.ts
├── src/modules/dashboard/
│   ├── DashboardPage.tsx
│   └── DashboardEstudiante.tsx
├── src/index.css
└── e2e/
    ├── accessibility/example.a11y.spec.ts
    └── p2-responsive.spec.ts
```

## Diseño por fases

### Fase 0 - Investigación

- Inventariar recursos de marca y capas visuales existentes para evitar redundancias.
- Confirmar que la decoración puede resolverse como mejora progresiva sin dependencia de lógica.
- Definir restricciones del recurso generado: sin texto, sin controles aparentes y con espacio negativo.

### Fase 1 - Diseño

- Integrar una sola ilustración ambiental de baja prominencia en el contenedor compartido.
- Añadir ornamentos deterministas en CSS para continuidad entre páginas y temas.
- Reforzar PageHeader, Card y EmptyState únicamente mediante clases visuales compatibles.
- Reservar la presencia más expresiva de la ilustración para inicios de profesor y estudiante.
- Añadir contrato visual y guía reproducible de validación.
- Verificar estáticamente que cada botón y enlace tenga acción o destino, y reservar las explicaciones para recorridos guiados reabribles.

### Fase 2 - Implementación y verificación

- Generar, inspeccionar y copiar el recurso final dentro del proyecto.
- Implementar componentes/capas no interactivas con fallbacks.
- Activar recorridos existentes en la primera visita, persistiendo únicamente su versión local por rol.
- Integrar la auditoría de controles en el gate `npm run check`.
- Ejecutar tipos, lint, pruebas, build y recorridos visuales representativos.
- Verificar ausencia de regresiones en navegación, acciones y roles antes del PR.

## Decisiones y complejidad

- Se elige una ilustración ambiental única en lugar de múltiples imágenes por página para reducir peso, repetición y riesgo de inconsistencia.
- No se incorporan animaciones complejas; los efectos suaves existentes siguen respetando movimiento reducido.
- No se rediseñan formularios ni componentes de negocio. La decoración vive en superficies compartidas y puede retirarse sin afectar la funcionalidad.
- Las formas geométricas simples continúan en CSS; la imagen generada se usa solo donde un recurso raster original aporta identidad material.

## Verificación posterior al diseño

Todos los principios constitucionales continúan satisfechos. No existen excepciones, cambios de datos, nuevas dependencias, interfaces públicas ni riesgos sobre el flujo de calificaciones.

## Evolución: iconografía personalizada — Issue #43

- Generar cuatro recursos raster transparentes y sin texto para Materias, Recursos, Calificar y Presentaciones.
- Mantener una dirección visual común: silueta compacta, volumen suave, paleta índigo/cian y detalles cálidos compatibles con la identidad existente.
- Incorporar un componente presentacional con reemplazo vectorial cuando un archivo no cargue.
- Usar la familia en accesos destacados donde el tamaño mínimo sea de 48 píxeles.
- Conservar los símbolos vectoriales actuales en navegación, botones y controles pequeños para no perder nitidez ni semántica.
- No añadir dependencias, llamadas de red, persistencia ni cambios de contratos.
- Validar carga, reemplazo, modo claro/oscuro y 360 píxeles mediante pruebas focalizadas y build.
