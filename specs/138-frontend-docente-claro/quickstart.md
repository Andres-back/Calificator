# Validación del frontend docente claro

Registro local previo al PR. Implementación verificada con datos sintéticos; CI remoto y fusión son pasos posteriores. No se modificaron producción, notas, evidencias, proveedores ni modelos, ni se usó la copia real de producción.

## Diseño y alcance

- Especificación 16/16 y lista UX 8/8 revisadas antes de implementar, con delegación expresa del usuario.
- Analyze: 12 requisitos funcionales y 5 criterios de éxito cubiertos por 14 tareas, sin ambigüedades, duplicaciones ni conflictos constitucionales.
- Maqueta previa en frontend/output/spec138-design/propuesta.html y capturas de diseño a 384/1440 px, en claro/oscuro. No se confunden con las capturas de la implementación.
- Entrega: lectura principal sin instrucciones repetidas, detalle técnico en Historial, vocabulario único, compartir individual sin CTA duplicado, pestañas móviles visibles, revisión contextual y Pendientes con muestra honesta.
- Integración incremental sobre el mismo workspace; sin backend, migraciones, contratos de datos nuevos, dependencias añadidas o llamadas a IA. El único cambio de versión es el parche de seguridad expresamente autorizado más abajo.

## Resultados definitivos

| Comprobación | Resultado |
| --- | --- |
| Vitest completo | 1.312 pruebas aprobadas en 198 archivos |
| Regresión principal de navegador | 100/100, Chromium y WebKit |
| Accesibilidad de revisión | 11/11, claro/oscuro, 360–1920 px y altura reducida |
| Materias, Boletín e inicio móvil | 5/5, Chromium/WebKit donde corresponde |
| Compatibilidad de contexto, libro y borradores | 2/2, suite contextual mock |
| Lint estricto, TypeScript y build | Aprobados |
| audit:actions y audit:build | Aprobados, sin alterar sus umbrales |
| npm audit, umbral moderate, producción | Aprobado; permanecen cuatro avisos low preexistentes de KaTeX/transitivas |
| Inventario | 682 superficies, generación y comprobación sin deriva |
| Gobernanza completa | 61/61, sin exclusiones y con todas las tareas cerradas |

La regresión principal cubre selección de pregunta/hoja, enlaces antiguos, retorno de nivel, contexto contradictorio, permisos sin bandeja o sin Materias, rechazo del estudiante estándar, aprobación y copia de enlaces, borradores, conflictos 409, rúbricas sin puntaje, edición al redimensionar, scroll desde contenido/márgenes y texto al 200 %. Los escenarios específicos de puntajes, colores y fórmula conservan su cobertura unitaria; no se modificó cálculo académico.

Informes locales en E:/tesis/output/spec138-pruebas/: verified-regression.json, verified-a11y.json, subject-regression.json y compatibility.json. No se suman las repeticiones diagnósticas como pruebas distintas.

## Evidencia visual

[Capturas verificadas de la implementación](visual/README.md): 384/1440 px, ambos temas, y edición al 200 % con altura de 550 px. Solo contienen identidades sintéticas.

La suite genera además capturas en output/playwright/spec138/, directorio ya recogido por el CI como diagnóstico si falla. Los PNG seleccionados en visual/ permanecen revisables en el PR aunque CI termine correctamente. Se inspeccionaron visualmente los cuatro tamaños/temas y el editor ampliado, además de comprobar geometría, foco y acciones con navegador.

Emulación de Chromium/WebKit y altura reducida no equivalen a validación física de iPhone/Android ni a un teclado nativo real. Esta entrega no afirma tales comprobaciones.

## Fallos encontrados y correcciones verificadas

1. Cambiar selección desde una URL global podía canonicalizarla y remontar el workspace, perdiendo la búsqueda. La ruta global ya abierta permanece montada; los iniciadores nuevos construyen contexto sin cambiar permisos.
2. La cabecera repetía el alumno y consumía espacio. Se usa una ubicación visible única; identidad accesible y estados de edición se conservan.
3. Con letra al 200 %, una barra fija podía consumir la zona de lectura. Si supera un tercio del alto visible pasa al flujo normal, sin reducir la fuente ni ocultar acciones.
4. scrollIntoView desplazaba todos los ancestros, incluido main con overflow oculto. revealWithinReview limita el movimiento al scroller de revisión; mantiene el fallback nativo para el layout de flujo. Las aserciones de lista independiente, identidad visible y main.scrollTop igual a cero permanecieron intactas.
5. Pendientes podía quedarse sin monitor al salir del workspace integrado. Un predicado compartido conserva un solo monitor en cada superficie, con regresión unitaria RED → GREEN.

La revisión independiente detectó el caso del monitor y confirmó la cabecera redundante y la causa del scroll. No hubo cambios de pruebas para omitir permisos, escrituras o comprobaciones de integridad.

## Parche de seguridad autorizado

La auditoría detectó GHSA-mrwp-f3q8-3g9p en follow-redirects 1.16.1. El usuario autorizó solo el parche 1.16.2 y repetir pruebas. Se modificaron tres valores del lockfile: versión, URL e integridad oficial; package.json y el resto de versiones permanecen intactos.

npm ci instaló el lockfile en E:/tesis/tmp/spec138-deps; la junction de esta rama se apuntó a ese runtime aislado sin modificar dependencias de otros trabajos. No se ejecutó audit fix ni se actualizaron KaTeX u otras librerías. Sus cuatro avisos low requieren una revisión aparte; no bloquean el umbral moderate vigente y no se presentan como corregidos.

## Entorno local y reproducibilidad

El disco C: se quedó sin espacio para temporales. Se trasladaron TEMP/TMP a E:/tesis/tmp/spec138-runtime, sin borrar datos ajenos. Las primeras ejecuciones también detectaron fuentes fuera del allowlist de la junction y recargas provocadas por trazas HTML: esas ejecuciones se interrumpieron y no acreditan la entrega.

Se usó un servidor loopback único con caché aislada, acceso solo a frontend/dependencias y watch excluyendo artefactos. El harness ignorado frontend/output/spec138-local-vite.config.ts no se publica ni modifica la configuración de producción o CI.

Desde frontend: npm ci; npm run test:run; npm run lint:strict; npm run build; npm run audit:actions; npm run audit:build; npm audit --audit-level=moderate --omit=dev. Playwright usa los proyectos vigentes y las suites teacher-review-context, explainable-grading, grade-review-mobile, feedback-share-review y feedback-workspace-responsive; los informes anteriores registran la selección exacta ejecutada. Se probaron aparte p2-responsive, grading-review.a11y y los dos recorridos heredados de grading-review.mock. No se ampliaron timeouts ni se habilitaron reintentos para ocultar fallos.

## Convergencia y entrega

Converge contrastó 12 requisitos, 5 criterios de éxito, 12 escenarios de aceptación, 7 decisiones y 8 principios constitucionales: cero hallazgos missing/partial/contradicts/unrequested funcionales. No añadió una fase vacía ni modificó tasks.md durante la revisión limpia.

Gobernanza completa e inventario quedaron aprobados antes del commit. CI remoto debe quedar verde antes de cualquier fusión; este registro local no lo sustituye ni autoriza un despliegue manual. La reversión es por código: no requiere restaurar notas, borrar evidencias ni revertir datos.
