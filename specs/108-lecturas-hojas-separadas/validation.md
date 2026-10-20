# Validación local — Spec 108

2026-10-20. Especificación, plan y ampliación aprobados explícitamente en este chat; etiquetas registradas en #224. Rama `codex/108-lecturas-hojas-separadas`, base `3a5b1ae`. Presentación de cuentos/lecturas y controles de generación nueva. Se preserva la propuesta 098 ajena y la implementación 107 en su worktree separado.

## Puertas previas

Setup Tasks y check-prerequisites ejecutados. Checklist de requisitos 16/16 satisfechos, leído sin alterar marcas desde Implement. Analyze de solo lectura: 9 FR + 5 SC verificables, 10 tareas, cobertura 100 %, cero hallazgos críticos/altos y cero tareas sin referencia. Sin cambios constitucionales ni hooks configurados. Ignores existentes cubren secretos, dependencias y artefactos; sin nuevas tablas, endpoints, proveedores ni migraciones.

## Pruebas antes de código

`test_reading_worksheet_layout.py`: 13 casos, 10 fallaron y 3 pasaron antes de implementar. Se reprodujo ausencia de separación/numeración/renglones; lectura antigua como texto simple fallaba por `.get()` y un cuento con pregunta estructurada podía imprimir campos del objeto, incluyendo su respuesta esperada. Se corrigió proyectando solo el enunciado en la copia alumno; no se convierten objetos completos a texto. No se modificó ningún recurso guardado.

Frontend: las dos nuevas pruebas fallaron antes del cambio (imagen antes del título en cuento, título/ilustración ausentes en lectura). Después del cambio, 20 tests de StoryContent/ContenidoView pasaron. TypeScript y ESLint focalizado sin advertencias pasaron. El título precede a la imagen y narración; imagen completa con object-contain, sin recorte ni columnas paralelas. El estado sin imagen sigue legible, sin gran reserva de espacio.

## Resultado actual

- Render de impresión: título existente, ilustración proporcionada, narración; preguntas desde página nueva. Segundo folio incluye campo de nombre.
- Numeración proyectada consecutiva, conservando input. Respuestas breves: 2 renglones; explicación/inferencia/crítica o respuesta extensa: 4; sin metadatos: 3. Renglones de 7 mm; enunciado con primer renglón, resto puede continuar. Soluciones solo en copia docente sin renglones de trabajo.
- Contenido largo no se trunca; sin preguntas no se añade hoja vacía. Sin imagen no se genera otra ni se reserva un bloque vacío en PDF.
- Regresión backend: **62 passed en 4.11 s**, archivos lectura/total PDF/contratos/calidad de herramientas/asignación de material. Ruff focalizado pasó. No hay llamadas nuevas a IA.

## PDF real

Se usó la imagen local existente `xcalificator-spec101-final-backend:latest`, WeasyPrint 70.0, sin red, filesystem raíz de solo lectura y volúmenes exclusivamente de código/artefactos sintéticos. Ruta PYTHONPATH corregida tras un primer intento sin import de app. Cache tipográfica temporal en /tmp; no servicios de producción ni bases reales. Se reutilizó una ilustración geométrica sintética ya generada: cero nuevas inferencias o gasto por imagen.

Script reproducible: `qa_render.py`, con destino de artefactos ignorado `output/qa/spec108/` del workspace principal. Requiere imagen PNG sintética de entrada. Es un script QA, no un componente de runtime. El marcador de creación de artefactos se ejecutó una vez antes del primer render.

- Cuento breve: **2 páginas**, texto en 1, preguntas desde 2; **1.481 s**.
- Lectura sintética larga: **3 páginas**, texto en 1–2, preguntas desde 3; **0.503 s**.
- Ambas muestras: entrada idéntica antes/después, sin soluciones de cuestionario ni página final vacía. Texto extraído y PNG de todas las páginas revisados; tras ajustar nombre/etiqueta se re-renderizó y revisaron las páginas afectadas. Sin recortes/solapamientos observados.

Las duraciones son dos observaciones locales, no promesa de latencia ni comparación formal contra baseline. No confundir un PDF revisado con prueba móvil o CI.

## Pendientes antes de entrega

Tareas locales completadas con los resultados siguientes. CI remoto del PR y revisión humana siguen siendo puertas obligatorias antes de fusionar. No hay merge ni despliegue de Spec 108. Producción y datos anteriores intactos.
## Ampliación aprobada y muestra real (no fixture de relleno)

El usuario aclaró que el triángulo y los párrafos repetidos no eran una muestra aceptable de generación. Esos archivos anteriores son exclusivamente fixtures técnicas de paginación: la imagen fue reutilizada y la repetición fue deliberada para estrés; no acreditan calidad del generador.

Se aprobó la ampliación con «Sí, apruebo esta ampliación»: cuento corto de una página narrativa, medio/largo hasta dos; preguntas aparte; controles de repetición, contexto visual completo y moraleja automática/con/sin. Tasks y Analyze actualizados antes del código: 14 FR, 8 SC, 16 tareas, cobertura completa, sin conflictos críticos/altos. Checklist de calidad documental 16/16 leído como puerta, no utilizado para acreditar ejecución.

### Controles implementados

- Validar texto crudo antes de normalizar/deduplicar, solo en cuentos nuevos: tres párrafos, 120–230 palabras en corto o hasta 560 en medio/largo, duplicados exactos o casi idénticos y frases largas repetidas; título, personajes y preguntas completos. No es una certificación semántica.
- Medir narración real con WeasyPrint sin preguntas, reservando 260 px más margen para imagen/marco antes de solicitarla. Corto una página, medio/largo hasta dos. Medición en hilo separado; hasta una corrección textual y ninguna imagen para textos rechazados. Históricos nunca pasan por este gate.
- Imagen recibe todos los párrafos aceptados, personajes, tema y grado, con instrucción de una escena real del relato. No cambia la configuración global de modelos ni claves. Un placeholder no se conserva como imagen generada ni se presenta como tal en pantalla.
- Campo opcional de moraleja compatible por defecto. Selección docente probada. Corrección visual de prefijos numéricos duplicados, sin modificar preguntas guardadas.

### Ensayo de API autorizado

La primera comprobación se detuvo por un atributo incorrecto del script antes de llamar a IA. Al corregirlo, el primer proveedor configurado (Groq) no produjo cuento utilizable; se detuvo sin pedir imagen. El usuario autorizó después **un único ensayo OpenCode + una imagen low**. No se reintentó una imagen incierta ni se hicieron cambios de configuración.

Código candidato cargado solo en memoria de un proceso aislado del backend, usando sus adaptadores y credenciales existentes. Sin persistir Material/ImagenGenerada ni tocar notas/evidencias. No es E2E de UI/cola ni un despliegue de ese código.

Actividad ficticia «La huerta que volvió a beber», grado tercero, Lina y Tomás:

- Texto OpenCode `deepseek-v4-flash-vision-exp`: **3.811 s**, 202 palabras, tres párrafos, cero párrafos duplicados exactos.
- Ilustración OpenAI `gpt-image-2`, `low`, 1024×1024: **14.374 s**, una solicitud, imagen real, sin placeholder.
- PDF local del resultado: **1.695 s**, dos páginas: narración/ilustración/moraleja completas en la primera y preguntas desde la segunda. Reserva preventiva: una página narrativa. Todos los PNG revisados sin recortes ni superposiciones.
- Revisión humana de esta muestra: problema de huerta seca y desperdicio → recolección, riego y turnos/carteles → recuperación y colaboración. Moraleja derivada de esas acciones. Ilustración muestra niños en huerta de tomates, baldes bajo canaleta, riego al atardecer y cartel de gota. Es pertinente en conjunto; combina acciones del cuento y no prueba exactitud física de cada detalle (agua en canaleta al atardecer sin lluvia visible). No certifica futuras generaciones.
- Archivos locales ignorados: `output/qa/spec108/actual/` del workspace principal. Checkpoints de solicitud exclusiva evitan repetir cobros tras desconexión. No se obtuvo factura/token usage de imagen: no se declara costo cobrado.

### Regresión y paginación

Pruebas nuevas comenzaron con fallo de import al faltar el módulo. Suite focalizada final backend: **81 passed en 3.38 s**, Ruff verde. Suite unitaria completa: **1174 passed, 3 skipped en 58.56 s**; el host no tiene WeasyPrint. Runtime Docker sí lo tiene: ejecución equivalente de los tres casos PDF pasó (160 palabras → 1 página narrativa; 480 → 2; histórico completo de 5 páginas con marcador final conservado). La imagen runtime no trae pytest; no se oculta ese primer fallo, se ejecutaron las mismas aserciones en script QA sin instalar dependencias.

Comparación de exportación con el mismo cuento/imagen y runtime sin red: warmup + tres observaciones por versión. Baseline `3a5b1ae`: 0.770/0.793/0.734 s, mediana 0.770, una página mezclada. Candidato: 0.771/0.777/0.800 s, mediana 0.777, dos páginas separadas. Cero IA en exportación; no es benchmark de carga ni promesa de tiempo.

Frontend: 21 pruebas focalizadas de vistas/formulario pasaron antes de añadir la última regresión de prefijo. TypeScript y lint focalizado verdes; build completo de 3123 módulos, audit:actions y audit:build pasaron. Advertencias existentes de tamaño de chunk/plugin timings, sin error.

### Navegadores reales

Playwright CLI sobre harness local que importa los componentes reales, con cuento ficticio y PDF generados: Chromium y WebKit; 360/390/1280 px; claro/oscuro. 36 capturas de cuento, lectura y visor, imagen cargada y sin scroll horizontal de documento. Visor con páginas 1/2 accesibles; consola sin errores. Muestras representativas inspeccionadas visualmente; numeración de lectura se corrigió y recapturó. No acredita Safari/Android físicos ni la navegación completa de producción. Los scripts/capturas QA están ignorados bajo `frontend/output/`.

Inventario regenerado por evidencias de pruebas nuevas: 596 superficies, conteos sin cambios; diferencias exclusivamente en evidencia de tests y digest, no endpoints, tablas ni permisos. Primer governance local detectó la nueva spec 108 aún sin registrar y la propuesta 098 ajena sin versionar. Se registra 108 en índice/baseline; 098 permanece intacta y fuera del commit. Validación de snapshot aislado y suite completa frontend se registrarán al finalizar, sin fingir CI remoto verde.

Comprobaciones adicionales: enunciado de 1400 palabras continúa completo en PDF de cuatro páginas, con marcador final conservado; no muta contenido. Visor con fixture técnica de tres páginas a 360 px: página 3 accesible en Chromium y WebKit, sin overflow. 38 capturas QA en total. Regresión final focalizada backend: 32 casos de cuento/formato verdes; no se repitieron llamadas pagadas.

La primera suite frontend completa con pool por procesos dejó de informar progreso en Windows y se interrumpió. Con pool de hilos: 792 pasaron y falló una nueva prueba de prefijo porque su fixture solo tenía preguntas, sin narración/imagen; el componente mostró correctamente el estado de borrador vacío. Se añade narración a la fixture (sin relajar la aserción) y se repite focalizado/completo. Lint estricto global pasó. Los fallos iniciales de gobernanza por tareas pendientes/prefijos FR abreviados se corrigen documentando ejecución real y enumerando referencias; no se rebaja el validador ni se añade la propuesta 098 ajena al baseline versionado.

Segunda ejecución completa con dos hilos: 792/793 verdes; la prueba de cámara integrada encontró la imagen antes de que su contenedor animado fuera visible. Aislada pasó 15/15. Se mantiene `toBeVisible` pero dentro de `waitFor`, como corresponde a la condición asíncrona. No se cambia el componente de cámara ni su funcionalidad. La nueva prueba de numeración ya pasa; suite focalizada 22/22. Se repite suite completa tras sincronizar la aserción.

## Cierre local

Tercera ejecución completa con hilos: **123 archivos, 793 pruebas verdes en 163.81 s**; lint estricto global verde. Backend Ruff global F401/F821/F822/F823/F841 y compileall verdes. Inventario vigente de 596 superficies. Sincronización de cámara limitada a la prueba, sin cambios de comportamiento.

Converge de solo evaluación: 14 FR + 8 SC + 12 escenarios de aceptación, seis decisiones de diseño y ocho principios constitucionales revisados. Sin brechas funcionales ni adiciones de código fuera del alcance justificado; cero tareas nuevas de convergencia. Se preservan los artefactos ajenos. No hay hooks configurados. PR preparado con #224, aprobación registrada y resultados/limitaciones; ninguna autorización implícita de fusión o despliegue.

Gobernanza final: **49/49 pruebas pasaron en 12.29 s** sobre snapshot del candidato, excluyendo únicamente la propuesta local 098 no versionada. Validador del PR ejecutado con rama, etiquetas aprobadas y `Closes #224`: PASS. Se conserva el validador original, se registra 108 y se enumeran los FR; no se marcan falsamente tareas de CI remoto como realizadas. `git diff --check` verde. Sin fusión ni despliegue.

## Reparación de auditoría de CI (2026-10-20)

El usuario solicita «repáralo y vuelve a enviar CI». Run `39494190996`, job `118874827508`: falla antes de TypeScript/pruebas en `npm audit --audit-level=moderate --omit=dev`. Se recuperó su ZIP de logs en caché local tras timeouts intermitentes de GitHub. Causa bloqueante: `follow-redirects` 1.16.0, severidad alta, avisos [GHSA-q3jh-wrc6-jgq8](https://github.com/advisories/GHSA-q3jh-wrc6-jgq8) y [GHSA-8r9p-f939-6h3c](https://github.com/advisories/GHSA-8r9p-f939-6h3c), ambos corregidos en 1.16.1. La mención inicial de KaTeX como bloqueo se precisó al revisar el informe completo: sus avisos son bajos y no producen el fallo del umbral actual.

- Cambio funcional de reparación: únicamente tres líneas del lockfile (versión, URL e integridad) para `follow-redirects` 1.16.0 → 1.16.1, dentro de `^1.16.0` requerido por Axios 1.20.0. `package.json`, versiones de KaTeX, código de aplicación y workflow sin cambios.
- `npm ci --ignore-scripts` instaló 639 paquetes desde el lockfile. `npm audit --omit=dev --audit-level=moderate` terminó con exit 0: 0 críticas/altas/moderadas productivas, 4 bajas preexistentes de KaTeX/cadena Markdown. No se ejecutó `audit fix --force`. La auditoría que incluye desarrollo sigue informando avisos no resueltos; no se afirma ausencia total de vulnerabilidades.
- Prueba Node real solo en localhost, con cabeceras sintéticas: dos redirecciones entre orígenes distintos confirman eliminación de Authorization/Cookie en cabeceras de tipo array y de cabecera privada con `|` declarada en sensitiveHeaders; cabecera normal conservada. 2/2 verdes, cero llamadas externas. Script QA ignorado `frontend/output/qa108/redirect-smoke.mjs`.
- Regresión del parche: **20/20 pruebas de API/sesión**, TypeScript, lint estricto global, build (3123 módulos, 3.51 s de Vite) y audit:build verdes. Las 793 pruebas completas referidas arriba corresponden al commit anterior; el CI remoto del nuevo HEAD volverá a ejecutarlas, sin atribuirlas anticipadamente al parche.
- Inventario vigente (596 superficies), diff limpio, ninguna modificación a producción, notas, evidencias, modelos o claves. No se cambia umbral ni el hash de excepción para 503. T017 registra la preparación del nuevo HEAD; su push dispara CI normal y no autoriza bypass de controles.
- Gobernanza de la reparación: 49/49 pruebas verdes en snapshot del candidato (12.46 s), sin incluir ni modificar la propuesta 098 ajena. No hay hooks configurados.
