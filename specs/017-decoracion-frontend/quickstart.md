# Guía de validación: Decoración visual transversal

## Preparación

1. Instalar dependencias del frontend.
2. Iniciar servicios locales y el frontend.
3. Disponer de una sesión de profesor y una de estudiante.

## Verificación automática

```powershell
Set-Location frontend
npm run audit:actions
npm run lint
npm run typecheck
npm run test:run
npm run build
```

## Verificación visual

Para profesor y estudiante, revisar inicio, materias, evaluaciones y una página con formulario o tabla en:

- 360×800
- 390×844
- 768×1024
- 1366×768
- 1920×1080

En cada tamaño:

1. Alternar modo claro y oscuro.
2. Confirmar que no hay desplazamiento horizontal.
3. Confirmar que títulos, botones, menús, formularios y modales permanecen visibles y utilizables.
4. Bloquear o renombrar temporalmente la imagen decorativa y confirmar que la interfaz sigue siendo legible.
5. Activar movimiento reducido y confirmar que no hay animación decorativa persistente.
6. Recorrer al menos una acción por página y comprobar que su destino no cambió.

## Resultado esperado

La aplicación tiene una identidad más rica y coherente, pero mantiene exactamente los mismos recorridos, permisos y estados funcionales.

## Evidencia de implementación (2026-08-21)

- Recurso generado con la herramienta ImageGen y convertido a WebP: `frontend/public/branding/learning-atmosphere-v2.webp` (46.170 bytes; SHA-256 `A6E5E3539C897DF38B52C06DA7F8809AAAD675969323B8D44C6544299F23191B`).
- Prompt final: ilustración conceptual horizontal para fondo educativo, con libros, lápices, cuadernos, estrellas, bloques y rutas de conocimiento; paleta índigo, violeta, cian, cielo y menta; centro despejado; sin texto, números, logotipos, controles ni personas.
- Auditoría estática: 300 botones y 80 enlaces con acción, envío o destino verificable.
- Verificación principal: 50 archivos y 189 pruebas Vitest, lint, TypeScript y build Vite en verde.
- Gobernanza Spec Kit: 39 pruebas del validador pasaron y la spec 017 quedó registrada en el índice canónico.
- Accesibilidad: 1 recorrido Playwright confirmó nombre accesible y objetivo táctil mínimo en todos los botones visibles del acceso.
- Responsive: 20 recorridos Playwright pasaron para profesor, estudiante y administrador en 360×800, 390×844, 768×1024, 1024×768, 1366×768 y 1920×1080, además de todas las rutas docentes en modo oscuro móvil y escritorio, sin overflow general ni errores de consola.
- Capturas: `output/playwright/p2/profesor-dashboard-390x844.png`, `profesor-dashboard-1366x768.png`, `estudiante-dashboard-390x844.png` y `estudiante-dashboard-1366x768.png`.
- La auditoría detectó durante la implementación dos accesos rápidos del login por debajo de 40 px; se ajustaron a 44 px y la regresión quedó cubierta.
- Los recorridos de Calificaciones, Calificar foto, Modo salón y Boletín se presentan una vez por rol/versión y conservan su botón manual «¿Cómo se usa?».
- Regresión de apilamiento: los cuatro recorridos de creación IA pasan y los modales permanecen por encima de la barra lateral; el contenido ambiental no crea un `z-index` contenedor.

## Evidencia de iconografía personalizada — Issue #43 (2026-08-29)

- Se generaron cuatro ilustraciones cuadradas originales con fondo transparente y estética 3D suave de XCalificator: libro abierto para Materias, pieza de rompecabezas con lápiz para Recursos, portapapeles con verificación para Calificar y pantalla de proyección para Presentaciones.
- Prompt base: icono educativo amable, frontal/isométrico suave, paleta índigo-violeta-cian con acento amarillo, formas redondeadas, iluminación limpia, sin texto, letras, números, logotipos, personas ni elementos recortados; fondo totalmente transparente.
- Variación Materias: libro abierto índigo con páginas claras y destello de aprendizaje cian.
- Variación Recursos: rompecabezas violeta con lápiz cian y destello amarillo.
- Variación Calificar: portapapeles índigo con marca de verificación cian y destello amarillo.
- Variación Presentaciones: pantalla de proyección índigo con símbolo visual cian y pequeño destello.
- Los originales de 1254×1254 se optimizaron a WebP 320×320 con alfa; los cuatro archivos en `frontend/public/branding/icons/` pesan aproximadamente 85 KB en conjunto.
- `BrandFeatureIcon` usa carga asíncrona, semántica decorativa y fallback Lucide; los iconos funcionales de navegación y botones no fueron reemplazados.
- Validación real: inicio, Recursos y Presentaciones cargaron los activos en 390×844 sin overflow horizontal ni errores de consola; pruebas focalizadas y build Vite pasaron.

## Evidencia de iconografía semántica — Issue #45 (2026-08-29)

- La familia raster general anterior fue reemplazada porque no ayudaba a distinguir acciones concretas.
- La lámina generada se conserva optimizada en `specs/017-decoracion-frontend/assets/semantic-icons-reference.webp` y es la fuente visual aprobada de los activos servidos en producción.
- Prompt final de ImageGen: tablero de 18 conceptos para inicio, materias, recursos, presentaciones, reportes, tutor IA, configuración IA, crucigrama, sopa de letras, relacionar pares, guía, taller, cuento, colorear, refuerzo, lectura, mapa conceptual y flashcards; estilo vectorial duotono índigo/cian, siluetas redondeadas, sin texto, logotipos, sombras ni fondos.
- La salida generada se separó en 18 WebP transparentes de 256×256 bajo `frontend/public/branding/semantic-icons/`; navegación y recursos usan esas miniilustraciones originales.
- El símbolo SVG anterior permanece oculto como fallback automático si un WebP no puede cargarse.
- Los tipos históricos `unir_columnas` y `ficha` comparten icono con `emparejar` y `taller`; continúan fuera del selector de creación.
- La correspondencia se aplica en barra lateral, selector, cambio rápido, inicio docente, listado general, materia, detalle docente y vista estudiante.
- Los símbolos conservan las etiquetas textuales y no modifican acciones, rutas ni permisos.

### Sustitución controlada

Los cuatro WebP de Materias, Recursos, Calificar y Presentaciones y su componente dedicado se retiraron al quedar reemplazados por la familia semántica. La sección anterior se conserva como historial de la evolución visual.

### Validación del reemplazo

- Regresión focalizada: 6 archivos y 35 pruebas pasaron, incluida la cobertura parametrizada de los 21 símbolos y la navegación móvil.
- Playwright en 390×844 confirmó siete destinos docentes distintos, once formatos canónicos distintos, modo oscuro, cero overflow horizontal y cero errores de consola.

## Evidencia de iconografía contextual — Issue #51 (2026-08-29)

- Se generó una segunda lámina de 18 conceptos con el mismo lenguaje visual aprobado.
- Los recortes finales son WebP de 256×256 con alfa real bajo `frontend/public/branding/semantic-icons/`.
- Las áreas conocidas se resuelven por nombre normalizado; las áreas libres conservan `subjects.webp` como fallback.
- La integración cubre acciones frecuentes, bandeja docente, tarjetas y cabecera de materia, pestañas internas y métricas/detalle de reportes.

## Evidencia de estados y encabezados ilustrados — Issue #53 (2026-08-30)

- Se generaron nueve ilustraciones independientes para interactivos, borradores archivados, PDF listos, presentación en proceso/lista/con error e IA institucional/clave propia/ruteo por función.
- Prompt base de ImageGen: icono educativo 3D vectorial pulido, formas redondeadas, contorno índigo, paleta violeta-cian-amarillo con acentos semánticos, objeto centrado, sin texto, marcas, contenedor ni fondo; transparencia alfa real.
- Los archivos finales se normalizaron a WebP 256×256 bajo `frontend/public/branding/semantic-icons/` y conservan fallback SVG local.
- La barra superior ahora resuelve Configuración IA como contexto propio y usa la familia ilustrada para profesor y estudiante.
- Regresión focalizada: 4 archivos y 66 pruebas pasaron; TypeScript y lint estricto permanecen verdes.
- Playwright validó Recursos, Presentaciones y Configuración IA en 390×844, además de Configuración IA en 1366×768 claro/oscuro: todos los WebP cargaron, `scrollWidth` coincidió con `clientWidth` y no hubo errores de consola.
