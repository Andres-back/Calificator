# Validación rápida: Optimizar fluidez y organización del frontend

## Prerrequisitos

- Docker en ejecución para recorridos integrados.
- Dependencias frontend instaladas.
- Directorio de trabajo en `frontend/`.

## Validaciones estáticas y unitarias

```powershell
npm run audit:actions
npm run lint
npm run typecheck
npm run test:run
npm run build
```

Resultados esperados:

- No hay botones o enlaces sin destino.
- El debounce, la bandeja compacta, la navegación móvil y las rutas públicas pasan sus pruebas.
- `dist/index.html` no precarga chunks `charts`, `markdown` ni `document-export`.
- Los recursos WebP requeridos existen en `dist/branding`.

## Validación responsive y accesibilidad

```powershell
npm run test:a11y
npm run test:visual
npm run test:mock
```

Comprobar especialmente 360×800, 390×844, 768×1024, 1366×768 y 1920×1080 en claro y oscuro.

## Escenarios manuales

1. Abrir `/` a 360 px: “Ingresar” y “Crear cuenta” son visibles.
2. Abrir `/login`: existe una sola recuperación de contraseña.
3. Entrar como profesor y escribir rápidamente un nombre en Calificaciones: el campo no se bloquea y se consulta una sola vez al pausar.
4. Entrar a una materia a 360 px: el selector indica la sección actual y permite abrir cada sección autorizada.
5. Abrir Inicio docente sin casos: aparece una sola bandeja compacta. Con casos: aparecen las listas.
6. Entrar como estudiante y permanecer treinta segundos en evaluaciones, boletín y Xali: no hay solicitudes periódicas si no existe procesamiento.
7. Enviar una evidencia que quede procesando: su estado sí se actualiza hasta finalizar.

## Medición de transferencia pública

Con caché desactivada, sumar recursos propios solicitados por `/` o `/login`. El objetivo es menos de 2,20 MB y ninguna descarga de una imagen marcada exclusivamente para otro breakpoint.

## Resultados de implementación — 2026-09-26

### Línea base y transferencia

- Línea base pública aproximada: **3,67 MB** de recursos propios y de terceros observados antes de la optimización.
- Build actual: la entrada HTML precarga únicamente runtime, React, proveedor de aplicación e iconos. Ya no precarga `charts`, `markdown` ni `document-export`.
- El conjunto inicial conservador de JavaScript, CSS, pantalla pública, imágenes WebP y fuentes WOFF2 usadas queda alrededor de **1,42 MB sin compresión**, por debajo del límite de 2,20 MB y con una reducción aproximada del **61 %** frente a la línea base.
- `hero-login.webp` pesa 40.040 bytes frente a la fuente PNG de gran tamaño; `pattern-hero.webp` 9.984 bytes; `logo-full.webp` 2.274 bytes.
- En acceso móvil la ilustración exclusiva de escritorio se sirve como fondo CSS dentro del breakpoint `lg`, y la prueba confirma que no se solicita a 360 px.

### Búsqueda, consultas y navegación

- La búsqueda de calificaciones conserva `useDebouncedValue(..., 300)`, resultados previos durante la transición y cancelación mediante `AbortSignal`.
- La regresión unitaria confirma que una ráfaga `a` → `an` → `ana` publica solo `ana` después de 300 ms.
- Se retiró el sondeo fijo de vistas estables de evaluaciones, boletines y Xali. Las entregas y trabajos realmente transitorios mantienen actualización condicional.
- La materia ofrece un selector móvil derivado de las mismas rutas y permisos que las pestañas de escritorio.
- La landing muestra “Ingresar” y “Crear cuenta” a 360 px; el acceso conserva una sola recuperación de contraseña.

### Verificación ejecutada

- `npm run check`: auditoría de **388 botones y 111 enlaces**, lint, TypeScript, **410 pruebas unitarias**, build y auditoría de recursos: verde.
- `npm run test:mock`: **3/3** recorridos mock verdes, incluida búsqueda móvil de estudiantes.
- Accesibilidad: **10/10** casos verdes después de ampliar las áreas táctiles de enlaces legales a 40 px.
- Regresión visual: **15/15** casos verdes en claro/oscuro y 360, 390, 768, 1366 y 1920 px; referencias actualizadas solo después de inspeccionar los cambios intencionales.
- Responsive específico: profesor 1920 px, navegación de siete secciones de materia, autenticación pública y admin 360 px sin desbordamiento: verdes.

### CSP y ruido externo

- No se ampliaron `script-src`, `connect-src` ni `img-src`.
- `ERR_BLOCKED_BY_CLIENT` de Cloudflare Insights y el bloqueo de GTM inyectado por infraestructura/extensiones no impiden las funciones del producto y no se ocultaron debilitando CSP.
- El aviso de Vite por el chunk principal de 569 kB queda como optimización posterior; gráficas y Markdown siguen siendo chunks diferidos y no forman parte de las precargas públicas.
