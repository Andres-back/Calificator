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

## Evolución: iconografía semántica — Issue #45

- Sustituir los cuatro recursos generales por una familia vectorial liviana, escalable y basada en significado.
- Definir símbolos comunes para navegación y tipos de material, conservando un reemplazo existente para destinos no cubiertos.
- Mantener una única correspondencia entre tipo de recurso e icono para evitar diferencias entre selector, listados, materia y vistas de detalle.
- Asociar los tipos históricos `unir_columnas` y `ficha` con sus equivalentes visuales `emparejar` y `taller` sin volver a exponerlos en creación.
- Conservar etiquetas textuales, nombres accesibles, destinos, permisos y contratos.
- Validar todos los símbolos mediante prueba parametrizada, catálogo canónico, navegación, modo claro/oscuro, 390 píxeles y compilación.
- Usar el tablero generado únicamente como referencia de diseño optimizada dentro de la especificación; no enviarlo al navegador.
- Retirar los activos raster reemplazados para evitar código y archivos sin consumidor.

## Hotfix: visibilidad de iconos semánticos — Issue #47

- Mantener los pictogramas SVG y su correspondencia funcional ya desplegada.
- Presentar cada icono de navegación dentro de una insignia duotono de 36 píxeles con contraste blanco y color propio.
- Reforzar ligeramente el trazo para conservar legibilidad en pantallas pequeñas y modo oscuro.
- No modificar etiquetas, rutas, áreas táctiles ni acciones.
- Añadir una regresión focalizada que exija las siete insignias docentes y ejecutar lint y build.

## Hotfix: integración de la lámina ilustrada — Issue #49

- Usar la lámina aprobada como fuente real, no únicamente como referencia artística.
- Separar sus 18 conceptos en WebP transparentes y optimizados de 256×256.
- Resolver la ruta del activo desde `EducationalIcon` para aplicar la misma identidad en todas las superficies.
- Mantener el SVG existente oculto como fallback de carga.
- Ampliar la presencia visual en navegación, selector, listados, materia, detalle, estudiante, inicio y presentaciones.
- Validar existencia de archivos, correspondencia canónica, carga, lint y build sin modificar lógica funcional.

## Hotfix: ampliación de iconografía contextual — Issue #51

- Generar una segunda familia de 18 miniilustraciones coherente con la lámina aprobada.
- Integrarla en acciones docentes, bandeja, materias por área, navegación interna y reportes.
- Mantener fallback SVG y fallback general de área, sin cambiar comportamiento funcional.
- Validar alfa real, correspondencia semántica, temas, 390 píxeles, pruebas focalizadas, lint y build.

## Hotfix: estados y encabezados ilustrados — Issue #53

- Generar nueve ilustraciones independientes con fondo transparente para métricas de Recursos, estados de Presentaciones y modalidades de configuración IA.
- Integrarlas mediante `EducationalIcon` y `StatCard`, conservando el fallback SVG y evitando reemplazar controles pequeños universales.
- Resolver el contexto de `/app/configuracion-ia` en la barra superior y reutilizar ilustraciones existentes para el resto de rutas de profesor y estudiante.
- No modificar consultas, mutaciones, contadores, estados, permisos, rutas ni nombres accesibles.
- Validar recursos, encabezado, configuración IA, modo oscuro y ancho móvil con pruebas focalizadas, tipos, lint y build.
